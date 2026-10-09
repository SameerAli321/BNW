import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Interview } from '../entities/interview.entity';
import { Candidate } from '../entities/candidate.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { CandidateStatus } from '../common/enums/candidate-status.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import {
  InterviewEmailStatus,
  InterviewMode,
  InterviewStatus,
} from '../common/enums/interview.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { MailResult, MailService } from '../mail/mail.service';
import { buildIcs } from '../mail/ics';
import { BRAND } from '../mail/email-layout';
import {
  CancelInterviewDto,
  InterviewOutcomeDto,
  QueryInterviewsDto,
  ScheduleInterviewDto,
} from './dto/interview.dto';
import {
  dateToPkt,
  pktToDate,
  RenderedEmail,
  InterviewEmailData,
  InterviewEmailKind,
  renderCandidateEmail,
  renderInterviewerEmail,
} from './interview-emails';

export interface InterviewDto {
  id: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  scheduledAt: string;
  /** Pakistan-time parts of scheduledAt, for edit forms. */
  date: string;
  time: string;
  durationMinutes: number;
  mode: InterviewMode;
  meetingLink: string | null;
  location: string | null;
  interviewers: { id: number; name: string; email: string }[];
  message: string | null;
  status: InterviewStatus;
  cancelReason: string | null;
  emailStatus: InterviewEmailStatus | null;
  emailError: string | null;
  emailSentAt: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Bulk CV upload gives candidates a placeholder address — never email it. */
const PLACEHOLDER_EMAIL_DOMAIN = '@pending.local';

const fullName = (user: Pick<User, 'firstName' | 'lastName'>) =>
  `${user.firstName} ${user.lastName}`.trim();

type ScheduleFields = Pick<
  Interview,
  | 'scheduledAt'
  | 'durationMinutes'
  | 'mode'
  | 'meetingLink'
  | 'location'
  | 'interviewerIds'
  | 'message'
>;

/**
 * Interview scheduling: HR/ADMIN schedule an interview with a shortlisted candidate, and the
 * candidate + interviewers are emailed a BNW-branded invitation with a calendar invite.
 * Reschedule / cancel re-email everyone. Whether the candidate's email went out is stored on the
 * row so the UI can show it and offer "Resend".
 */
@Injectable()
export class InterviewsService {
  constructor(
    @InjectRepository(Interview) private readonly interviewsRepo: Repository<Interview>,
    @InjectRepository(Candidate) private readonly candidatesRepo: Repository<Candidate>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    private readonly mail: MailService,
  ) {}

  // --------------------------------------------------------------------------------------------
  // Reads

  async list(query: QueryInterviewsDto): Promise<InterviewDto[]> {
    const where: Record<string, unknown> = {};
    if (query.candidateId) where.candidateId = query.candidateId;
    if (query.upcoming === 'true') {
      where.status = InterviewStatus.SCHEDULED;
      // Still show one that started in the last hour — it may be in progress.
      where.scheduledAt = MoreThanOrEqual(new Date(Date.now() - 3600_000));
    }
    const rows = await this.interviewsRepo.find({
      where,
      relations: ['candidate', 'createdByUser'],
      order: query.upcoming === 'true' ? { scheduledAt: 'ASC' } : { scheduledAt: 'DESC' },
      take: 500,
    });
    return this.toDtos(rows);
  }

  async findOne(id: number): Promise<InterviewDto> {
    const [dto] = await this.toDtos([await this.load(id)]);
    return dto;
  }

  private async load(id: number): Promise<Interview> {
    const row = await this.interviewsRepo.findOne({
      where: { id },
      relations: ['candidate', 'createdByUser'],
    });
    if (!row) throw new NotFoundException('Interview not found');
    return row;
  }

  private async toDtos(rows: Interview[]): Promise<InterviewDto[]> {
    const ids = [...new Set(rows.flatMap((r) => r.interviewerIds ?? []))];
    const users = ids.length
      ? await this.usersRepo.find({ where: { id: In(ids) }, withDeleted: true })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((row) => {
      const pkt = dateToPkt(row.scheduledAt);
      return {
        id: row.id,
        candidateId: row.candidateId,
        candidateName: row.candidate?.name ?? '',
        candidateEmail: row.candidate?.email ?? '',
        scheduledAt: row.scheduledAt.toISOString(),
        date: pkt.date,
        time: pkt.time,
        durationMinutes: row.durationMinutes,
        mode: row.mode,
        meetingLink: row.meetingLink,
        location: row.location,
        interviewers: (row.interviewerIds ?? [])
          .map((id) => byId.get(id))
          .filter((u): u is User => !!u)
          .map((u) => ({ id: u.id, name: fullName(u), email: u.email })),
        message: row.message,
        status: row.status,
        cancelReason: row.cancelReason,
        emailStatus: row.emailStatus,
        emailError: row.emailError,
        emailSentAt: row.emailSentAt ? row.emailSentAt.toISOString() : null,
        createdByName: row.createdByUser ? fullName(row.createdByUser) : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });
  }

  // --------------------------------------------------------------------------------------------
  // Validation helpers

  private async loadCandidate(candidateId: number): Promise<Candidate> {
    const candidate = await this.candidatesRepo.findOne({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  private assertEmailable(candidate: Candidate): void {
    if (candidate.email.toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN)) {
      throw new BadRequestException(
        `${candidate.name} still has a placeholder email address. Edit the candidate and enter their real email first.`,
      );
    }
  }

  private async resolveInterviewers(ids: number[] = []): Promise<User[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const users = await this.usersRepo.find({ where: { id: In(unique) } });
    const active = users.filter((u) => u.status !== UserStatus.INACTIVE);
    if (active.length !== unique.length) {
      throw new BadRequestException(
        'One of the chosen interviewers no longer exists or is inactive',
      );
    }
    return unique.map((id) => active.find((u) => u.id === id) as User);
  }

  /** DTO → validated entity fields (date in the future, only the fields that fit the mode). */
  private toFields(dto: ScheduleInterviewDto, interviewers: User[]): ScheduleFields {
    const scheduledAt = pktToDate(dto.date, dto.time);
    if (Number.isNaN(scheduledAt.getTime()))
      throw new BadRequestException('Invalid interview date');
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'The interview time is in the past — pick a future date and time',
      );
    }
    return {
      scheduledAt,
      durationMinutes: dto.durationMinutes,
      mode: dto.mode,
      meetingLink: dto.mode === InterviewMode.ONLINE ? (dto.meetingLink?.trim() ?? null) : null,
      location: dto.mode === InterviewMode.IN_PERSON ? dto.location?.trim() || null : null,
      interviewerIds: interviewers.map((u) => u.id),
      message: dto.message?.trim() || null,
    };
  }

  private async senderName(caller: JwtUserPayload): Promise<string> {
    const user = await this.usersRepo.findOne({ where: { id: caller.sub } });
    return user ? fullName(user) : 'BNW HR';
  }

  private emailData(
    candidate: Candidate,
    fields: ScheduleFields,
    interviewers: User[],
    senderName: string,
  ): InterviewEmailData {
    return {
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      scheduledAt: fields.scheduledAt,
      durationMinutes: fields.durationMinutes,
      mode: fields.mode,
      meetingLink: fields.meetingLink,
      location: fields.location,
      message: fields.message,
      interviewerNames: interviewers.map(fullName),
      senderName,
    };
  }

  // --------------------------------------------------------------------------------------------
  // Writes

  /** The exact email the candidate would get — for the "Preview email" step. Nothing is saved. */
  async preview(
    candidateId: number,
    dto: ScheduleInterviewDto,
    caller: JwtUserPayload,
  ): Promise<RenderedEmail> {
    const candidate = await this.loadCandidate(candidateId);
    const interviewers = await this.resolveInterviewers(dto.interviewerIds);
    const fields = this.toFields(dto, interviewers);
    return renderCandidateEmail(
      'INVITE',
      this.emailData(candidate, fields, interviewers, await this.senderName(caller)),
    );
  }

  async schedule(
    candidateId: number,
    dto: ScheduleInterviewDto,
    caller: JwtUserPayload,
  ): Promise<InterviewDto> {
    const candidate = await this.loadCandidate(candidateId);
    if (candidate.status !== CandidateStatus.SHORTLISTED) {
      throw new ConflictException(
        'Only shortlisted candidates can be invited to an interview — shortlist them first',
      );
    }
    this.assertEmailable(candidate);
    const interviewers = await this.resolveInterviewers(dto.interviewerIds);
    const fields = this.toFields(dto, interviewers);

    const saved = await this.interviewsRepo.save(
      this.interviewsRepo.create({
        ...fields,
        candidateId,
        createdBy: caller.sub,
        status: InterviewStatus.SCHEDULED,
      }),
    );
    saved.candidate = candidate;
    await this.deliver(saved, 'INVITE', interviewers, caller);
    return this.findOne(saved.id);
  }

  async reschedule(
    id: number,
    dto: ScheduleInterviewDto,
    caller: JwtUserPayload,
  ): Promise<InterviewDto> {
    const interview = await this.load(id);
    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new ConflictException('Only an upcoming (scheduled) interview can be changed');
    }
    const interviewers = await this.resolveInterviewers(dto.interviewerIds);
    Object.assign(interview, this.toFields(dto, interviewers));
    interview.sequence += 1;
    await this.interviewsRepo.save(interview);

    if (dto.notify !== false) {
      this.assertEmailable(interview.candidate);
      await this.deliver(interview, 'RESCHEDULE', interviewers, caller);
    }
    return this.findOne(id);
  }

  async cancel(id: number, dto: CancelInterviewDto, caller: JwtUserPayload): Promise<InterviewDto> {
    const interview = await this.load(id);
    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new ConflictException('This interview is not scheduled any more');
    }
    interview.status = InterviewStatus.CANCELLED;
    interview.cancelReason = dto.reason?.trim() || null;
    interview.sequence += 1;
    await this.interviewsRepo.save(interview);

    const inFuture = interview.scheduledAt.getTime() > Date.now();
    if (dto.notify !== false && inFuture) {
      const interviewers = await this.resolveInterviewers(interview.interviewerIds).catch(() => []);
      await this.deliver(interview, 'CANCEL', interviewers, caller);
    }
    return this.findOne(id);
  }

  /** Send the current invitation again (e.g. after fixing SMTP, or the candidate lost it). */
  async resend(id: number, caller: JwtUserPayload): Promise<InterviewDto> {
    const interview = await this.load(id);
    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new ConflictException('Only an upcoming interview can be re-sent');
    }
    this.assertEmailable(interview.candidate);
    const interviewers = await this.resolveInterviewers(interview.interviewerIds).catch(() => []);
    await this.deliver(
      interview,
      interview.sequence > 0 ? 'RESCHEDULE' : 'INVITE',
      interviewers,
      caller,
      {
        candidateOnly: true,
      },
    );
    return this.findOne(id);
  }

  async setOutcome(id: number, dto: InterviewOutcomeDto): Promise<InterviewDto> {
    const interview = await this.load(id);
    if (interview.status === InterviewStatus.CANCELLED) {
      throw new ConflictException('A cancelled interview has no outcome');
    }
    interview.status = dto.status;
    await this.interviewsRepo.save(interview);
    return this.findOne(id);
  }

  // --------------------------------------------------------------------------------------------
  // Email + notifications

  private async deliver(
    interview: Interview,
    kind: InterviewEmailKind,
    interviewers: User[],
    caller: JwtUserPayload,
    options: { candidateOnly?: boolean } = {},
  ): Promise<void> {
    const candidate = interview.candidate;
    const data = this.emailData(candidate, interview, interviewers, await this.senderName(caller));
    const method = kind === 'CANCEL' ? 'CANCEL' : 'REQUEST';
    const organizer = { name: BRAND.name, email: this.mail.fromAddress() || 'hr@bnw.local' };
    const end = new Date(interview.scheduledAt.getTime() + interview.durationMinutes * 60_000);
    const uid = `interview-${interview.id}@bnw-oms`;
    const locationText =
      interview.mode === InterviewMode.ONLINE
        ? interview.meetingLink
        : interview.mode === InterviewMode.IN_PERSON
          ? interview.location
          : 'Phone call';

    // Candidate email — its result is what the UI shows.
    const candidateEmail = renderCandidateEmail(kind, data, interview.cancelReason);
    const result = await this.mail.send({
      to: candidate.email,
      subject: candidateEmail.subject,
      html: candidateEmail.html,
      text: candidateEmail.text,
      icalEvent: {
        method,
        content: buildIcs({
          uid,
          sequence: interview.sequence,
          method,
          start: interview.scheduledAt,
          end,
          summary: `Interview — ${BRAND.name}`,
          description: candidateEmail.text,
          location: locationText,
          url: interview.meetingLink,
          organizer,
          attendees: [{ name: candidate.name, email: candidate.email }],
        }),
      },
    });
    await this.recordEmailResult(interview.id, result);

    if (options.candidateOnly || !interviewers.length) return;

    // Interviewers: one internal email to all of them, plus an in-app notification each.
    const staffEmail = renderInterviewerEmail(kind, data, interview.cancelReason);
    await this.mail.send({
      to: interviewers.map((u) => u.email),
      subject: staffEmail.subject,
      html: staffEmail.html,
      text: staffEmail.text,
      icalEvent: {
        method,
        content: buildIcs({
          uid: `${uid}-staff`,
          sequence: interview.sequence,
          method,
          start: interview.scheduledAt,
          end,
          summary: `Interview: ${candidate.name}`,
          description: staffEmail.text,
          location: locationText,
          url: interview.meetingLink,
          organizer,
          attendees: interviewers.map((u) => ({ name: fullName(u), email: u.email })),
        }),
      },
    });
    await this.notificationsRepo.save(
      interviewers
        .filter((u) => u.id !== caller.sub)
        .map((u) =>
          this.notificationsRepo.create({
            userId: u.id,
            type: 'INTERVIEW',
            title: staffEmail.subject.slice(0, 255),
            body: null,
            link: '/dashboard/candidates',
          }),
        ),
    );
  }

  private async recordEmailResult(id: number, result: MailResult): Promise<void> {
    await this.interviewsRepo.update(id, {
      emailStatus: InterviewEmailStatus[result.status],
      emailError: result.status === 'FAILED' ? result.error.slice(0, 2000) : null,
      emailSentAt: result.status === 'SENT' ? new Date() : null,
    });
  }
}
