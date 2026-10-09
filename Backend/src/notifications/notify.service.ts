import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { MailService } from '../mail/mail.service';
import { renderActionEmail } from '../mail/action-email';
import { EmailDetailRow } from '../mail/email-layout';

export type NotifyOptions = {
  /** Notification type, e.g. 'LEAVE_REQUEST'. */
  type: string;
  /** Shown in the bell and used as the email subject. */
  title: string;
  /** App path the notification opens, e.g. '/dashboard/leave-requests/12'. */
  link: string;
  /** Optional second line in the bell / extra sentence in the email. */
  body?: string | null;
  /** Email heading — defaults to the title. */
  heading?: string;
  /** Extra "label: value" rows in the email. */
  rows?: EmailDetailRow[];
  /** Set false for bell only. Default: bell + email. */
  email?: boolean;
};

/**
 * One way for every workflow to tell people something: a bell notification plus an email (one per
 * person, with an "Open in BNW HR system" button). The bell rows are saved before returning; the
 * emails go out in the background so nobody waits on SMTP. Never throws.
 */
@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    private readonly mail: MailService,
  ) {}

  async send(userIds: (number | null | undefined)[], options: NotifyOptions): Promise<void> {
    const ids = [...new Set(userIds.filter((id): id is number => typeof id === 'number'))];
    if (!ids.length) return;
    try {
      await this.notificationsRepo.save(
        ids.map((userId) =>
          this.notificationsRepo.create({
            userId,
            type: options.type,
            title: options.title.slice(0, 255),
            body: options.body?.slice(0, 2000) || null,
            link: options.link,
          }),
        ),
      );
      if (options.email === false) return;

      const recipients = await this.usersRepo.find({
        where: { id: In(ids), status: UserStatus.ACTIVE },
      });
      const email = renderActionEmail({
        subject: options.title,
        heading: options.heading ?? options.title,
        intro: options.body ? `${options.title}. ${options.body}` : options.title,
        rows: options.rows ?? [],
        link: this.mail.appUrl(options.link),
        buttonLabel: 'Open in BNW HR system',
      });
      for (const user of recipients) void this.mail.send({ to: user.email, ...email });
    } catch (error) {
      this.logger.error(`Notification failed (${options.link}): ${(error as Error).message}`);
    }
  }

  /** Active users with any of these roles, optionally leaving one person out. */
  async activeUserIds(roles: RoleName[], excludeId?: number): Promise<number[]> {
    const users = await this.usersRepo.find({
      where: { role: In(roles), status: UserStatus.ACTIVE },
    });
    return users.map((user) => user.id).filter((id) => id !== excludeId);
  }
}
