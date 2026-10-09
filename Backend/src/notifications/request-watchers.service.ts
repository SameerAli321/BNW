import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { MailService } from '../mail/mail.service';
import { renderActionEmail } from '../mail/action-email';
import { BRAND, EmailDetailRow } from '../mail/email-layout';

/** Only these roles may turn on "notify me about every new request". */
export const REQUEST_WATCHER_ROLES: string[] = [RoleName.HR, RoleName.ADMIN, RoleName.CEO];

export type NewRequestEvent = {
  /** Who submitted it — never notified about their own request. */
  requesterId: number;
  requesterName: string;
  /** e.g. 'Leave request', 'Reimbursement claim'. */
  kind: string;
  /** One line about it, e.g. 'Annual leave, 12–14 Oct (3 days)'. */
  summary: string;
  /** App path, e.g. '/dashboard/leave-requests/12'. */
  link: string;
  details?: EmailDetailRow[];
};

/**
 * "Notify me about every new request": everyone who opted in (HR / Admin / CEO) gets an in-app
 * notification and an email whenever anyone submits a request or form. People the normal flow
 * already notified about this same item (e.g. the line manager) are skipped, so nobody gets it
 * twice. Called after the item is saved; never throws — a notification problem must not fail
 * the request itself.
 */
@Injectable()
export class RequestWatchersService {
  private readonly logger = new Logger(RequestWatchersService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    private readonly mail: MailService,
  ) {}

  /** Fire-and-forget wrapper so callers don't wait on SMTP. */
  notifyNewRequest(event: NewRequestEvent): void {
    this.deliver(event).catch((error: Error) =>
      this.logger.error(`New-request notification failed (${event.link}): ${error.message}`),
    );
  }

  /** Awaitable version (used by tests). Returns the ids that were notified. */
  async deliver(event: NewRequestEvent): Promise<number[]> {
    const watchers = await this.usersRepo.find({
      where: {
        notifyAllRequests: true,
        status: UserStatus.ACTIVE,
        role: In(REQUEST_WATCHER_ROLES as RoleName[]),
      },
    });
    let recipients = watchers.filter((user) => user.id !== event.requesterId);
    if (!recipients.length) return [];

    // Skip anyone the normal flow just notified about this same item.
    const recent = await this.notificationsRepo.find({
      where: {
        userId: In(recipients.map((user) => user.id)),
        link: event.link,
        createdAt: MoreThan(new Date(Date.now() - 2 * 60_000)),
      },
    });
    const alreadyNotified = new Set(recent.map((n) => n.userId));
    recipients = recipients.filter((user) => !alreadyNotified.has(user.id));
    if (!recipients.length) return [];

    const title = `New ${event.kind.toLowerCase()} from ${event.requesterName}`.slice(0, 255);
    await this.notificationsRepo.save(
      recipients.map((user) =>
        this.notificationsRepo.create({
          userId: user.id,
          type: 'NEW_REQUEST',
          title,
          body: event.summary.slice(0, 2000) || null,
          link: event.link,
        }),
      ),
    );

    const email = renderActionEmail({
      subject: title,
      heading: `New ${event.kind.toLowerCase()}`,
      intro: `${event.requesterName} has submitted a ${event.kind.toLowerCase()}.`,
      rows: [
        { label: 'Request', value: event.kind },
        { label: 'From', value: event.requesterName },
        ...(event.summary ? [{ label: 'Details', value: event.summary }] : []),
        ...(event.details ?? []),
      ],
      link: this.mail.appUrl(event.link),
      buttonLabel: 'Open in BNW HR system',
      badge: { label: 'New request', color: BRAND.blue },
    });
    // One email each, so recipients don't see each other's addresses.
    await Promise.all(recipients.map((user) => this.mail.send({ to: user.email, ...email })));
    return recipients.map((user) => user.id);
  }
}
