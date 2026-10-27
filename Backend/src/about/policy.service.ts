import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PolicyAcknowledgement } from '../entities/policy-acknowledgement.entity';
import { User } from '../entities/user.entity';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { NotifyService } from '../notifications/notify.service';
import { AuditLogService } from '../audit-log/audit-log.service';

/**
 * The Employee Policy Handbook's version (its text lives in the frontend, sections/company-about).
 * Bump it whenever the handbook changes — everyone is then asked to acknowledge the new version.
 */
export const POLICY_VERSION = '2026-10';

/** See everyone's acknowledgements; Team Leads see their direct reports'. */
const VIEW_ALL_ROLES: string[] = [RoleName.CEO, RoleName.HR, RoleName.ADMIN];
const HR_ROLES = [RoleName.HR, RoleName.ADMIN];

const fullName = (user: { firstName: string; lastName: string } | null | undefined) =>
  user ? `${user.firstName} ${user.lastName}`.trim() : '';

/** 'Ali  zafar ' → 'ali zafar' — the typed signature must match the person's own name. */
const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export interface MyPolicyAcknowledgementDto {
  version: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  signatureText: string | null;
  sentTo: string[];
  /** Who it will be (or was) sent to: the person's manager, and HR. */
  recipients: string[];
}

export interface PolicyAcknowledgementRowDto {
  userId: number;
  name: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
  managerName: string | null;
  acknowledgedAt: string | null;
  signatureText: string | null;
}

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(PolicyAcknowledgement)
    private readonly acksRepo: Repository<PolicyAcknowledgement>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly notifier: NotifyService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async loadUser(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id }, relations: ['manager'] });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** The person's manager (if active) plus HR / Admin — leaving the person themself out. */
  private async recipientsFor(user: User): Promise<User[]> {
    const hr = await this.usersRepo.find({
      where: { role: In(HR_ROLES), status: UserStatus.ACTIVE },
      order: { firstName: 'ASC' },
    });
    const people = [
      ...(user.manager && user.manager.status === UserStatus.ACTIVE ? [user.manager] : []),
      ...hr,
    ];
    const seen = new Set<number>([user.id]);
    return people.filter((p) => !seen.has(p.id) && seen.add(p.id));
  }

  /** GET /about/policy/acknowledgement/mine */
  async mine(caller: JwtUserPayload): Promise<MyPolicyAcknowledgementDto> {
    const user = await this.loadUser(caller.sub);
    const ack = await this.acksRepo.findOne({
      where: { userId: caller.sub, policyVersion: POLICY_VERSION },
    });
    const recipients = await this.recipientsFor(user);
    return {
      version: POLICY_VERSION,
      acknowledged: !!ack,
      acknowledgedAt: ack ? ack.acknowledgedAt.toISOString() : null,
      signatureText: ack?.signatureText ?? null,
      sentTo: ack?.sentTo ?? [],
      recipients: [
        ...(user.manager && recipients.some((r) => r.id === user.manager!.id)
          ? [`${fullName(user.manager)} (your manager)`]
          : []),
        ...(recipients.some((r) => r.id !== user.managerId) ? ['HR'] : []),
      ],
    };
  }

  /**
   * POST /about/policy/acknowledge — the employee signs (types their full name). Saved once per
   * handbook version, then sent to their manager and HR / Admin (bell + email), with a copy to
   * the employee.
   */
  async acknowledge(
    caller: JwtUserPayload,
    signatureText: string,
    meta: { ipAddress: string | null; userAgent: string | null },
  ): Promise<MyPolicyAcknowledgementDto> {
    const user = await this.loadUser(caller.sub);
    if (normalise(signatureText) !== normalise(fullName(user))) {
      throw new BadRequestException(`Type your full name exactly as "${fullName(user)}" to sign`);
    }
    const existing = await this.acksRepo.findOne({
      where: { userId: caller.sub, policyVersion: POLICY_VERSION },
    });
    if (existing) throw new ConflictException('You have already acknowledged this handbook');

    const recipients = await this.recipientsFor(user);
    const sentTo = recipients.map((r) =>
      r.id === user.managerId ? `${fullName(r)} (manager)` : `${fullName(r)} (HR)`,
    );
    const saved = await this.acksRepo.save(
      this.acksRepo.create({
        userId: user.id,
        policyVersion: POLICY_VERSION,
        signatureText: signatureText.trim(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent?.slice(0, 500) ?? null,
        sentTo,
      }),
    );
    this.auditLogService.log({
      actorId: caller.sub,
      action: 'POLICY_ACKNOWLEDGED',
      entity: 'PolicyAcknowledgement',
      entityId: saved.id,
      after: { version: POLICY_VERSION, sentTo },
      ipAddress: meta.ipAddress,
    });

    const when = saved.acknowledgedAt.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Karachi',
    });
    const rows = [
      { label: 'Employee', value: fullName(user) },
      { label: 'Handbook version', value: POLICY_VERSION },
      { label: 'Signed as', value: saved.signatureText },
      { label: 'Signed on', value: `${when} PKT` },
    ];
    await this.notifier.send(
      recipients.map((r) => r.id),
      {
        type: 'POLICY_ACKNOWLEDGEMENT',
        title: `${fullName(user)} acknowledged the Employee Policy Handbook`,
        body: 'They have read the handbook and signed the acknowledgement.',
        link: '/dashboard/about-us/guide-sheet/handbook?tab=acknowledgements',
        rows,
      },
    );
    await this.notifier.send([user.id], {
      type: 'POLICY_ACKNOWLEDGEMENT',
      title: 'You acknowledged the Employee Policy Handbook',
      body: sentTo.length ? `A copy was sent to ${sentTo.join(', ')}.` : null,
      link: '/dashboard/about-us/guide-sheet/handbook',
      rows,
    });
    return this.mine(caller);
  }

  /**
   * GET /about/policy/acknowledgements — who has signed the current version: everyone active for
   * CEO / HR / Admin, a Team Lead's direct reports for them.
   */
  async list(caller: JwtUserPayload): Promise<{
    version: string;
    data: PolicyAcknowledgementRowDto[];
    summary: { total: number; acknowledged: number; pending: number };
  }> {
    const users = await this.usersRepo.find({
      where: {
        status: UserStatus.ACTIVE,
        ...(VIEW_ALL_ROLES.includes(caller.role) ? {} : { managerId: caller.sub }),
      },
      relations: ['manager', 'department'],
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
    const acks = users.length
      ? await this.acksRepo.find({
          where: { userId: In(users.map((u) => u.id)), policyVersion: POLICY_VERSION },
        })
      : [];
    const byUser = new Map(acks.map((ack) => [ack.userId, ack]));
    const data = users.map((u) => {
      const ack = byUser.get(u.id);
      return {
        userId: u.id,
        name: fullName(u),
        employeeCode: u.employeeCode,
        designation: u.designation,
        department: u.department?.name ?? null,
        managerName: u.manager ? fullName(u.manager) : null,
        acknowledgedAt: ack ? ack.acknowledgedAt.toISOString() : null,
        signatureText: ack?.signatureText ?? null,
      };
    });
    const acknowledged = data.filter((row) => row.acknowledgedAt).length;
    return {
      version: POLICY_VERSION,
      data,
      summary: { total: data.length, acknowledged, pending: data.length - acknowledged },
    };
  }

  /** POST /about/policy/remind — bell + email to people who haven't signed the current version. */
  async remind(caller: JwtUserPayload, userIds?: number[]): Promise<{ reminded: number }> {
    const { data } = await this.list(caller);
    const pending = data
      .filter((row) => !row.acknowledgedAt)
      .filter((row) => !userIds?.length || userIds.includes(row.userId))
      .map((row) => row.userId);
    await this.notifier.send(pending, {
      type: 'POLICY_ACKNOWLEDGEMENT',
      title: 'Please read and acknowledge the Employee Policy Handbook',
      body: 'Open About us → Guide sheet, read the handbook and sign the acknowledgement at the end.',
      link: '/dashboard/about-us/guide-sheet/handbook',
    });
    return { reminded: pending.length };
  }
}
