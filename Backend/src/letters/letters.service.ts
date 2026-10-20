import { createHash } from 'crypto';
import { join } from 'path';
import { readFile, stat } from 'fs/promises';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LetterTemplate } from '../entities/letter-template.entity';
import { Letter } from '../entities/letter.entity';
import { LetterEvent } from '../entities/letter-event.entity';
import { Signature } from '../entities/signature.entity';
import { DocumentType } from '../entities/document-type.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { Candidate } from '../entities/candidate.entity';
import { User } from '../entities/user.entity';
import { LetterStatus } from '../common/enums/letter-status.enum';
import { LetterEventAction } from '../common/enums/letter-event-action.enum';
import { LetterTemplateType } from '../common/enums/letter-template-type.enum';
import { DocumentSource } from '../common/enums/document-source.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { CandidateStatus } from '../common/enums/candidate-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import {
  LetterDeliveryDto,
  LetterDto,
  LetterTemplateDto,
  toLetterDto,
  toLetterEventDto,
  toLetterTemplateDto,
  toSignatureDto,
} from '../common/mappers/letter.mapper';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLetterTemplateDto } from './dto/create-letter-template.dto';
import { UpdateLetterTemplateDto } from './dto/update-letter-template.dto';
import { QueryLetterTemplatesDto } from './dto/query-letter-templates.dto';
import { CreateLetterDto } from './dto/create-letter.dto';
import { UpdateLetterDto } from './dto/update-letter.dto';
import { QueryLettersDto } from './dto/query-letters.dto';
import { LetterPdfRendererService, resolveLetterFieldValues } from './letter-pdf-renderer.service';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';
import { NotifyService } from '../notifications/notify.service';
import { MailService } from '../mail/mail.service';
import { renderActionEmail } from '../mail/action-email';

// Maps a letter template type to the E-record document type it should be filed under once the
// employee signs. Falls back to 'Other' for template types with no dedicated document type yet.
const DOCUMENT_TYPE_NAME_BY_LETTER_TYPE: Partial<Record<LetterTemplateType, string>> = {
  [LetterTemplateType.OFFER]: 'Signed Offer Letter',
  [LetterTemplateType.CONTRACT]: 'Signed Contract',
};

/** Everything up to the employee's signature can still be edited (see updateLetter). */
const EDITABLE_LETTER_STATUSES: LetterStatus[] = [
  LetterStatus.DRAFT,
  LetterStatus.CHANGES_REQUESTED,
  LetterStatus.PENDING_CEO,
  LetterStatus.CEO_SIGNED,
  LetterStatus.SENT_TO_EMPLOYEE,
];

const letterSubject = (letter: Letter) =>
  letter.subjectUser
    ? `${letter.subjectUser.firstName} ${letter.subjectUser.lastName}`
    : (letter.subjectCandidate?.name ?? 'the employee');

/** Candidates uploaded without an email get a placeholder address — never send to those. */
const isPlaceholderEmail = (email: string | null | undefined) =>
  !email || email.toLowerCase().endsWith('@pending.local');

/**
 * The User the PDF renderer / field resolution reads from. For a letter that still belongs to a
 * candidate (no account yet) this is a stand-in built from the candidate: name split into
 * first/last, email, everything else empty.
 */
function letterSubjectForRender(letter: Letter): User {
  if (letter.subjectUser) return letter.subjectUser;
  const candidate = letter.subjectCandidate;
  const [firstName, ...rest] = (candidate?.name ?? '').trim().split(/\s+/);
  return Object.assign(new User(), {
    firstName: firstName ?? '',
    lastName: rest.join(' '),
    email: candidate && !isPlaceholderEmail(candidate.email) ? candidate.email : '',
    employeeCode: null,
    designation: null,
    department: null,
    manager: null,
    joinDate: null,
    currentSalary: null,
  });
}

@Injectable()
export class LettersService {
  constructor(
    @InjectRepository(LetterTemplate) private readonly templatesRepo: Repository<LetterTemplate>,
    @InjectRepository(Letter) private readonly lettersRepo: Repository<Letter>,
    @InjectRepository(LetterEvent) private readonly eventsRepo: Repository<LetterEvent>,
    @InjectRepository(Signature) private readonly signaturesRepo: Repository<Signature>,
    @InjectRepository(DocumentType) private readonly documentTypesRepo: Repository<DocumentType>,
    @InjectRepository(EmployeeProfile)
    private readonly profilesRepo: Repository<EmployeeProfile>,
    @InjectRepository(Candidate) private readonly candidatesRepo: Repository<Candidate>,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
    private readonly pdfRenderer: LetterPdfRendererService,
    private readonly auditLogService: AuditLogService,
    private readonly notifier: NotifyService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------------------------

  async listTemplates(query: QueryLetterTemplatesDto): Promise<LetterTemplateDto[]> {
    const qb = this.templatesRepo.createQueryBuilder('template');
    if (query.type) {
      qb.andWhere('template.type = :type', { type: query.type });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('template.isActive = :isActive', { isActive: query.isActive });
    }
    qb.orderBy('template.name', 'ASC');
    const rows = await qb.getMany();
    return rows.map(toLetterTemplateDto);
  }

  private async findTemplateEntityOrThrow(id: number): Promise<LetterTemplate> {
    const template = await this.templatesRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Letter template not found');
    }
    return template;
  }

  /** Detail includes bodyHtml (unlike the list) so the admin edit form can show the real body. */
  async getTemplate(id: number): Promise<LetterTemplateDto & { bodyHtml: string }> {
    const template = await this.findTemplateEntityOrThrow(id);
    return { ...toLetterTemplateDto(template), bodyHtml: template.bodyHtml };
  }

  async getTemplateFields(id: number) {
    const template = await this.findTemplateEntityOrThrow(id);
    return template.fieldsSchema;
  }

  async createTemplate(dto: CreateLetterTemplateDto): Promise<LetterTemplateDto> {
    const template = this.templatesRepo.create({
      type: dto.type,
      name: dto.name,
      roleScope: dto.roleScope ?? null,
      bodyHtml: dto.bodyHtml,
      fieldsSchema: dto.fieldsSchema,
      version: dto.version ?? 1,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.templatesRepo.save(template);
    return toLetterTemplateDto(saved);
  }

  async updateTemplate(id: number, dto: UpdateLetterTemplateDto): Promise<LetterTemplateDto> {
    const template = await this.findTemplateEntityOrThrow(id);
    if (dto.type !== undefined) template.type = dto.type;
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.roleScope !== undefined) template.roleScope = dto.roleScope;
    if (dto.bodyHtml !== undefined) template.bodyHtml = dto.bodyHtml;
    if (dto.fieldsSchema !== undefined) template.fieldsSchema = dto.fieldsSchema;
    if (dto.version !== undefined) template.version = dto.version;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;
    const saved = await this.templatesRepo.save(template);
    return toLetterTemplateDto(saved);
  }

  // ---------------------------------------------------------------------------------------------
  // Letters — reads
  // ---------------------------------------------------------------------------------------------

  /**
   * Ownership check for the "self if subject" endpoints (GET /letters/:id, GET /letters/:id/pdf):
   * HR/CEO/ADMIN always allowed. The letter's own subject is only let through once it has actually
   * been sent to them (`SENT_TO_EMPLOYEE`/`SIGNED`) — HR/CEO's internal drafting-and-signing pass
   * (DRAFT/PENDING_CEO/CHANGES_REQUESTED/CEO_SIGNED) is not visible to the subject until it's
   * explicitly released, same boundary as `listLetters` below. Unlike UsersService.assertCanViewRecord
   * there's no "manager-of" case here — letters are between HR/CEO and the named subject only, per
   * API_CONTRACT_SPRINT3.md.
   */
  assertCanView(caller: JwtUserPayload, subjectUserId: number | null, status: LetterStatus): void {
    if (
      caller.role === RoleName.HR ||
      caller.role === RoleName.CEO ||
      caller.role === RoleName.ADMIN
    ) {
      return;
    }
    if (
      caller.sub === subjectUserId &&
      (status === LetterStatus.SENT_TO_EMPLOYEE || status === LetterStatus.SIGNED)
    ) {
      return;
    }
    throw new ForbiddenException('You do not have access to this letter');
  }

  /** Bell + email about a letter (see NotifyService). */
  private async notifyLetter(
    userIds: (number | null | undefined)[],
    title: string,
    letter: Letter,
    body?: string | null,
    attachPdf = false,
  ): Promise<void> {
    await this.notifier.send(userIds, {
      type: 'LETTER',
      title,
      body: body ?? null,
      link: `/dashboard/letters/${letter.id}`,
      attachments: attachPdf ? await this.pdfAttachment(letter) : undefined,
    });
  }

  /** The letter's current PDF as an email attachment (none if it can't be read). */
  private async pdfAttachment(letter: Letter) {
    if (!letter.pdfPath) return undefined;
    try {
      const content = await readFile(join(UPLOADS_ROOT_DIR, letter.pdfPath));
      const filename = `${letter.template?.name ?? 'Letter'} - ${letterSubject(letter)}.pdf`
        .replace(/[\\/:*?"<>|]/g, '-')
        .slice(0, 150);
      return [{ filename, content, contentType: 'application/pdf' }];
    } catch {
      return undefined;
    }
  }

  private async loadLetterWithRelations(id: number): Promise<Letter> {
    const letter = await this.lettersRepo.findOne({
      where: { id },
      relations: [
        'template',
        'subjectUser',
        'subjectUser.department',
        'subjectUser.manager',
        'subjectCandidate',
        'preparedByUser',
      ],
    });
    if (!letter) {
      throw new NotFoundException('Letter not found');
    }
    return letter;
  }

  async listLetters(
    query: QueryLettersDto,
    caller: JwtUserPayload,
  ): Promise<{ data: LetterDto[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.lettersRepo
      .createQueryBuilder('letter')
      .leftJoinAndSelect('letter.template', 'template')
      .leftJoinAndSelect('letter.subjectUser', 'subjectUser')
      .leftJoinAndSelect('letter.subjectCandidate', 'subjectCandidate')
      .leftJoinAndSelect('letter.preparedByUser', 'preparedByUser');

    const isPrivileged =
      caller.role === RoleName.HR || caller.role === RoleName.CEO || caller.role === RoleName.ADMIN;
    if (!isPrivileged) {
      // Non-HR/CEO/ADMIN callers only ever see letters where they're the subject — server-side
      // filter, not a caller-controlled query param, per API_CONTRACT_SPRINT3.md. AND only once
      // the letter has actually been sent to them: HR/CEO's internal drafting-and-signing pass
      // (DRAFT/PENDING_CEO/CHANGES_REQUESTED/CEO_SIGNED) must not leak to the subject before it's
      // explicitly released — matches assertCanView's boundary above.
      qb.andWhere('letter.subjectUserId = :callerId', { callerId: caller.sub }).andWhere(
        'letter.status IN (:...visibleStatuses)',
        { visibleStatuses: [LetterStatus.SENT_TO_EMPLOYEE, LetterStatus.SIGNED] },
      );
    } else {
      // Per-person filters (E-record "Letters" card, Hiring "Letters (n)") — privileged roles only.
      if (query.subjectUserId) {
        qb.andWhere('letter.subjectUserId = :subjectUserId', {
          subjectUserId: query.subjectUserId,
        });
      }
      if (query.candidateId) {
        qb.andWhere('letter.subjectCandidateId = :candidateId', { candidateId: query.candidateId });
      }
    }

    if (query.type) {
      qb.andWhere('letter.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('letter.status = :status', { status: query.status });
    }

    qb.orderBy('letter.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map((row) => toLetterDto(row)), meta: { total, page, limit } };
  }

  async getLetter(id: number, caller: JwtUserPayload): Promise<LetterDto> {
    const letter = await this.loadLetterWithRelations(id);
    this.assertCanView(caller, letter.subjectUserId, letter.status);

    const events = await this.eventsRepo.find({
      where: { letterId: id },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });
    const signatures = await this.signaturesRepo.find({
      where: { letterId: id },
      relations: ['signer'],
      order: { signedAt: 'ASC' },
    });

    return toLetterDto(letter, {
      events: events.map(toLetterEventDto),
      signatures: signatures.map(toSignatureDto),
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Letters — writes / status machine
  // ---------------------------------------------------------------------------------------------

  async createLetter(dto: CreateLetterDto, preparedBy: number): Promise<LetterDto> {
    const hasUser = dto.subjectUserId != null;
    const hasCandidate = dto.subjectCandidateId != null;
    if (hasUser === hasCandidate) {
      throw new BadRequestException('Choose exactly one subject: an employee or a candidate');
    }
    const template = await this.findTemplateEntityOrThrow(dto.templateId);
    if (dto.subjectUserId != null) {
      await this.usersService.findOneEntity(dto.subjectUserId); // 404s if the subject doesn't exist
    } else {
      const candidate = await this.candidatesRepo.findOne({
        where: { id: dto.subjectCandidateId },
      });
      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }
      if (candidate.status === CandidateStatus.HIRED) {
        throw new BadRequestException(
          'This candidate has already been converted to an employee — prepare the letter for their employee account instead',
        );
      }
    }

    const letter = this.lettersRepo.create({
      templateId: template.id,
      type: template.type,
      subjectUserId: dto.subjectUserId ?? null,
      subjectCandidateId: dto.subjectCandidateId ?? null,
      preparedBy,
      fieldValues: dto.fieldValues ?? {},
      status: LetterStatus.DRAFT,
      currentVersion: 1,
    });
    const saved = await this.lettersRepo.save(letter);
    return toLetterDto(await this.loadLetterWithRelations(saved.id));
  }

  private async findLetterOrThrow(id: number): Promise<Letter> {
    const letter = await this.lettersRepo.findOne({ where: { id } });
    if (!letter) {
      throw new NotFoundException('Letter not found');
    }
    return letter;
  }

  private async logEvent(
    letterId: number,
    actorId: number,
    action: LetterEventAction,
    comment: string | null = null,
  ): Promise<void> {
    await this.eventsRepo.save(this.eventsRepo.create({ letterId, actorId, action, comment }));

    // Gap-fix Gap 2: mirror every letter status transition into audit_logs alongside the
    // letter_events write, per docs/API_CONTRACT_GAPS_FIX.md. Fire-and-forget, doesn't block.
    this.auditLogService.log({
      actorId,
      action: 'LETTER_STATUS_CHANGE',
      entity: 'Letter',
      entityId: letterId,
      after: { event: action, comment },
    });
  }

  /**
   * PATCH /letters/:id — HR / Admin / CEO can change a letter's fields at any point until the
   * employee signs it. Editing a letter the CEO already signed (CEO_SIGNED / SENT_TO_EMPLOYEE)
   * removes that signature and returns it to DRAFT, so the changed version is signed again; if it
   * had already been sent, the employee is told it was withdrawn for changes.
   */
  async updateLetter(id: number, dto: UpdateLetterDto, caller: JwtUserPayload): Promise<LetterDto> {
    const letter = await this.loadLetterWithRelations(id);
    if (!EDITABLE_LETTER_STATUSES.includes(letter.status)) {
      throw new ConflictException(
        letter.status === LetterStatus.SIGNED
          ? 'This letter is already signed by the employee — create a new letter instead'
          : `A ${letter.status.toLowerCase()} letter can't be edited`,
      );
    }
    const changed = JSON.stringify(letter.fieldValues ?? {}) !== JSON.stringify(dto.fieldValues);
    if (!changed) return toLetterDto(letter);

    const wasSentToEmployee = letter.status === LetterStatus.SENT_TO_EMPLOYEE;
    const ceoSigned = letter.status === LetterStatus.CEO_SIGNED || wasSentToEmployee;
    letter.fieldValues = dto.fieldValues;
    if (ceoSigned) {
      await this.signaturesRepo.delete({ letterId: id, signerRole: RoleName.CEO });
      letter.status = LetterStatus.DRAFT;
    }
    await this.lettersRepo.save(letter);

    // Drafts are saved often — only edits made after the letter left HR show on its timeline.
    if (letter.status !== LetterStatus.DRAFT || ceoSigned) {
      await this.logEvent(
        id,
        caller.sub,
        LetterEventAction.EDITED,
        ceoSigned ? "The CEO's signature was removed — submit it to the CEO again" : null,
      );
    }
    // Keep the PDF in step with the fields, so "View PDF" shows the edited version.
    if (letter.pdfPath) await this.renderAndStorePdf(letter);

    if (wasSentToEmployee) {
      await this.notifyLetter(
        [letter.subjectUserId],
        `${letter.template.name} was withdrawn for changes`,
        letter,
        'HR is updating this letter. You will get the new version to sign once it is ready.',
      );
    }
    return toLetterDto(await this.loadLetterWithRelations(id));
  }

  /** Renders the letter's PDF with whatever signatures it has so far and stores the new path. */
  private async renderAndStorePdf(letter: Letter): Promise<string> {
    const signatures = await this.signaturesRepo.find({
      where: { letterId: letter.id },
      relations: ['signer'],
      order: { signedAt: 'ASC' },
    });
    const pdfPath = await this.pdfRenderer.render(
      letter,
      letter.template,
      letterSubjectForRender(letter),
      signatures,
      await this.findSubjectProfile(letter),
    );
    letter.pdfPath = pdfPath;
    await this.lettersRepo.save(letter);
    return pdfPath;
  }

  /** POST /letters/:id/preview — re-renders the PDF without changing status. */
  async preview(id: number): Promise<{ pdfUrl: string }> {
    const letter = await this.loadLetterWithRelations(id);
    await this.renderAndStorePdf(letter);
    return { pdfUrl: `/letters/${id}/pdf` };
  }

  async submitToCeo(id: number, caller: JwtUserPayload): Promise<LetterDto> {
    const letter = await this.findLetterOrThrow(id);
    if (letter.status !== LetterStatus.DRAFT && letter.status !== LetterStatus.CHANGES_REQUESTED) {
      throw new ConflictException(
        `Cannot submit a letter in status ${letter.status} to CEO — must be DRAFT or CHANGES_REQUESTED`,
      );
    }
    letter.status = LetterStatus.PENDING_CEO;
    await this.lettersRepo.save(letter);
    await this.logEvent(id, caller.sub, LetterEventAction.SUBMITTED);
    const submitted = await this.loadLetterWithRelations(id);
    await this.notifyLetter(
      await this.notifier.activeUserIds([RoleName.CEO], caller.sub),
      `${submitted.template.name} for ${letterSubject(submitted)} — needs your signature`,
      submitted,
    );
    return toLetterDto(submitted);
  }

  async requestChanges(id: number, comment: string, caller: JwtUserPayload): Promise<LetterDto> {
    const letter = await this.findLetterOrThrow(id);
    if (letter.status !== LetterStatus.PENDING_CEO) {
      throw new ConflictException(
        `Cannot request changes on a letter in status ${letter.status} — must be PENDING_CEO`,
      );
    }
    letter.status = LetterStatus.CHANGES_REQUESTED;
    await this.lettersRepo.save(letter);
    await this.logEvent(id, caller.sub, LetterEventAction.CHANGES_REQUESTED, comment);
    const returned = await this.loadLetterWithRelations(id);
    await this.notifyLetter(
      [returned.preparedBy],
      `The CEO asked for changes to ${returned.template.name} for ${letterSubject(returned)}`,
      returned,
      comment,
    );
    return toLetterDto(returned);
  }

  /** Candidates have no E-record profile yet. */
  private async findSubjectProfile(letter: Letter): Promise<EmployeeProfile | null> {
    if (letter.subjectUserId == null) return null;
    return this.profilesRepo.findOne({ where: { userId: letter.subjectUserId } });
  }

  private async computeDocumentHash(letter: Letter, template: LetterTemplate): Promise<string> {
    const resolved = resolveLetterFieldValues(
      template.fieldsSchema,
      letter.fieldValues ?? {},
      letterSubjectForRender(letter),
      await this.findSubjectProfile(letter),
    );
    const payload = JSON.stringify({
      values: resolved.map((f) => ({ key: f.key, value: f.value })),
      templateVersion: template.version,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  async ceoSign(
    id: number,
    signatureText: string,
    caller: JwtUserPayload,
    meta: { ipAddress: string | null; userAgent: string | null },
  ): Promise<LetterDto> {
    const letter = await this.loadLetterWithRelations(id);
    if (letter.status !== LetterStatus.PENDING_CEO) {
      throw new ConflictException(
        `Cannot CEO-sign a letter in status ${letter.status} — must be PENDING_CEO`,
      );
    }

    letter.status = LetterStatus.CEO_SIGNED;
    await this.lettersRepo.save(letter);

    await this.signaturesRepo.save(
      this.signaturesRepo.create({
        letterId: id,
        signerId: caller.sub,
        signerRole: RoleName.CEO,
        signatureText,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        documentHash: await this.computeDocumentHash(letter, letter.template),
      }),
    );
    this.auditLogService.log({
      actorId: caller.sub,
      action: 'SIGNATURE',
      entity: 'Letter',
      entityId: id,
      after: { signerRole: RoleName.CEO },
      ipAddress: meta.ipAddress,
    });
    await this.logEvent(id, caller.sub, LetterEventAction.CEO_SIGNED);

    // Re-render so the PDF HR sends to the employee is dated and carries the CEO's signature.
    await this.renderAndStorePdf(letter);

    await this.notifyLetter(
      [letter.preparedBy],
      `The CEO signed ${letter.template.name} for ${letterSubject(letter)} — ready to send to the ${letter.subjectUserId == null ? 'candidate' : 'employee'}`,
      letter,
    );
    return toLetterDto(await this.loadLetterWithRelations(id));
  }

  async sendToEmployee(
    id: number,
    message: string | null,
    caller: JwtUserPayload,
  ): Promise<LetterDto & { delivery: LetterDeliveryDto }> {
    const letter = await this.loadLetterWithRelations(id);
    if (letter.status !== LetterStatus.CEO_SIGNED) {
      throw new ConflictException(
        `Cannot send a letter in status ${letter.status} to the employee — must be CEO_SIGNED`,
      );
    }
    if (letter.subjectUserId == null) {
      return this.sendToCandidate(letter, message, caller);
    }

    letter.status = LetterStatus.SENT_TO_EMPLOYEE;
    await this.lettersRepo.save(letter);
    // Optional HR note, shown to the employee on the letter's timeline (same event.comment
    // pattern the frontend already renders for CHANGES_REQUESTED) — see docs/API_CONTRACT_SPRINT3.md
    // addendum "Send to employee message".
    await this.logEvent(id, caller.sub, LetterEventAction.SENT_TO_EMPLOYEE, message);

    // Email carries the CEO-signed PDF; the employee signs it in the portal. NotifyService only
    // emails ACTIVE users, so a removed (INACTIVE) employee gets the bell row but no email.
    await this.notifyLetter(
      [letter.subjectUserId],
      `You have a letter to sign: ${letter.template.name}`,
      letter,
      message ?? 'A copy is attached. Please open it in the BNW HR system to sign it.',
      true,
    );
    const subject = letter.subjectUser;
    const inactive = subject?.status === UserStatus.INACTIVE;
    const delivery: LetterDeliveryDto = {
      recipientType: 'EMPLOYEE',
      emailedTo: inactive ? null : (subject?.email ?? null),
      emailStatus: inactive ? 'SKIPPED' : 'QUEUED',
      warning: inactive
        ? `${letterSubject(letter)}'s account is inactive, so no email was sent — download the PDF and share it another way.`
        : letter.pdfPath
          ? null
          : 'The letter has no rendered PDF, so the email went out without an attachment.',
    };

    return { ...toLetterDto(await this.loadLetterWithRelations(id)), delivery };
  }

  /**
   * send-to-employee for a letter that still belongs to a candidate (no account yet): the
   * CEO-signed PDF is emailed straight to the candidate's address (no bell — there's no user).
   * They sign it in the portal once their account is created; the letter moves onto that account
   * on conversion. The SMTP outcome is returned and written to the audit log.
   */
  private async sendToCandidate(
    letter: Letter,
    message: string | null,
    caller: JwtUserPayload,
  ): Promise<LetterDto & { delivery: LetterDeliveryDto }> {
    const candidate = letter.subjectCandidate;
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    if (isPlaceholderEmail(candidate.email)) {
      throw new BadRequestException(
        "Add the candidate's real email first (Hiring → edit candidate) — they have no email address on file",
      );
    }

    letter.status = LetterStatus.SENT_TO_EMPLOYEE;
    await this.lettersRepo.save(letter);
    await this.logEvent(letter.id, caller.sub, LetterEventAction.SENT_TO_EMPLOYEE, message);

    const attachments = await this.pdfAttachment(letter);
    const intro =
      `BNW has sent you your ${letter.template.name}. A copy is attached. ` +
      "You'll be able to sign it in the BNW HR system once your employee account has been created — we'll email you when it's ready.";
    const email = renderActionEmail({
      subject: `Your ${letter.template.name} from BNW`,
      heading: `Your ${letter.template.name}`,
      intro: message ? `${intro} ${message}` : intro,
      rows: [
        { label: 'Letter', value: letter.template.name },
        { label: 'For', value: candidate.name },
      ],
      link: this.mail.appUrl('/'),
      buttonLabel: 'Open BNW HR system',
    });
    const result = await this.mail.send({ to: candidate.email, ...email, attachments });

    this.auditLogService.log({
      actorId: caller.sub,
      action: 'LETTER_CANDIDATE_EMAIL',
      entity: 'Letter',
      entityId: letter.id,
      after: {
        candidateId: candidate.id,
        to: candidate.email,
        status: result.status,
        ...(result.status === 'FAILED' ? { error: result.error } : {}),
        attachedPdf: !!attachments,
      },
    });

    const delivery: LetterDeliveryDto = {
      recipientType: 'CANDIDATE',
      emailedTo: candidate.email,
      emailStatus: result.status,
      warning:
        result.status === 'FAILED'
          ? `The email to ${candidate.email} could not be sent (${result.error}) — download the PDF and share it another way.`
          : result.status === 'NOT_CONFIGURED'
            ? 'Email is not set up on the server, so nothing was actually delivered.'
            : attachments
              ? null
              : 'The letter has no rendered PDF, so the email went out without an attachment.',
    };
    return { ...toLetterDto(await this.loadLetterWithRelations(letter.id)), delivery };
  }

  private async resolveLetterDocumentTypeId(type: LetterTemplateType): Promise<number> {
    const preferredName = DOCUMENT_TYPE_NAME_BY_LETTER_TYPE[type];
    if (preferredName) {
      const preferred = await this.documentTypesRepo.findOne({ where: { name: preferredName } });
      if (preferred) {
        return preferred.id;
      }
    }
    const fallback = await this.documentTypesRepo.findOne({ where: { name: 'Other' } });
    if (!fallback) {
      throw new BadRequestException(
        'No suitable document type found to file the signed letter under',
      );
    }
    return fallback.id;
  }

  async employeeSign(
    id: number,
    signatureText: string,
    caller: JwtUserPayload,
    meta: { ipAddress: string | null; userAgent: string | null },
  ): Promise<LetterDto> {
    const letter = await this.loadLetterWithRelations(id);

    if (letter.subjectUserId !== caller.sub) {
      throw new ForbiddenException("Only the letter's subject may sign it");
    }
    if (letter.status !== LetterStatus.SENT_TO_EMPLOYEE) {
      throw new ConflictException(
        `Cannot sign a letter in status ${letter.status} — must be SENT_TO_EMPLOYEE`,
      );
    }

    letter.status = LetterStatus.SIGNED;
    await this.lettersRepo.save(letter);

    await this.signaturesRepo.save(
      this.signaturesRepo.create({
        letterId: id,
        signerId: caller.sub,
        signerRole: caller.role,
        signatureText,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        documentHash: await this.computeDocumentHash(letter, letter.template),
      }),
    );
    this.auditLogService.log({
      actorId: caller.sub,
      action: 'SIGNATURE',
      entity: 'Letter',
      entityId: id,
      after: { signerRole: caller.role },
      ipAddress: meta.ipAddress,
    });
    await this.logEvent(id, caller.sub, LetterEventAction.EMPLOYEE_SIGNED);

    // File the rendered PDF into the subject's E-record (guide's U5 "auto-retained in E-record"),
    // reusing Sprint 2's EmployeeDocument entity/service rather than duplicating file-storage
    // logic. Re-rendered first so the filed copy includes the employee's acknowledgement.
    const pdfPath = await this.renderAndStorePdf(letter);
    const documentTypeId = await this.resolveLetterDocumentTypeId(letter.type);
    const absolutePath = join(UPLOADS_ROOT_DIR, pdfPath);
    const fileStat = await stat(absolutePath);
    await this.employeesService.fileGeneratedDocument({
      employeeId: letter.subjectUserId,
      documentTypeId,
      filePath: pdfPath,
      originalName: `${letter.template.name} (letter #${letter.id}).pdf`,
      mime: 'application/pdf',
      size: fileStat.size,
      source: DocumentSource.LETTER,
      uploadedBy: caller.sub,
    });

    // Fully signed copy (both signatures): to the employee, and HR / Admin, by email + bell.
    await this.notifyLetter(
      [letter.subjectUserId],
      `Your signed ${letter.template.name}`,
      letter,
      'The fully signed copy is attached and saved in your documents in the BNW HR system.',
      true,
    );
    await this.notifyLetter(
      [
        letter.preparedBy,
        ...(await this.notifier.activeUserIds([RoleName.HR, RoleName.ADMIN], caller.sub)),
      ],
      `${letterSubject(letter)} signed ${letter.template.name}`,
      letter,
      'The signed copy is attached and has been filed in their E-record.',
      true,
    );

    return toLetterDto(await this.loadLetterWithRelations(id));
  }

  async getPdfForDownload(
    id: number,
    caller: JwtUserPayload,
  ): Promise<{ absolutePath: string; letter: Letter }> {
    const letter = await this.loadLetterWithRelations(id);
    this.assertCanView(caller, letter.subjectUserId, letter.status);
    if (!letter.pdfPath) {
      throw new NotFoundException('This letter has not been rendered yet — call /preview first');
    }
    return { absolutePath: join(UPLOADS_ROOT_DIR, letter.pdfPath), letter };
  }
}
