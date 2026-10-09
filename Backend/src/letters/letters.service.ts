import { createHash } from 'crypto';
import { join } from 'path';
import { stat } from 'fs/promises';
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
import { LetterStatus } from '../common/enums/letter-status.enum';
import { LetterEventAction } from '../common/enums/letter-event-action.enum';
import { LetterTemplateType } from '../common/enums/letter-template-type.enum';
import { DocumentSource } from '../common/enums/document-source.enum';
import { RoleName } from '../common/enums/role.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import {
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

// Maps a letter template type to the E-record document type it should be filed under once the
// employee signs. Falls back to 'Other' for template types with no dedicated document type yet.
const DOCUMENT_TYPE_NAME_BY_LETTER_TYPE: Partial<Record<LetterTemplateType, string>> = {
  [LetterTemplateType.OFFER]: 'Signed Offer Letter',
  [LetterTemplateType.CONTRACT]: 'Signed Contract',
};

const letterSubject = (letter: Letter) =>
  letter.subjectUser
    ? `${letter.subjectUser.firstName} ${letter.subjectUser.lastName}`
    : 'the employee';

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
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
    private readonly pdfRenderer: LetterPdfRendererService,
    private readonly auditLogService: AuditLogService,
    private readonly notifier: NotifyService,
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
  assertCanView(caller: JwtUserPayload, subjectUserId: number, status: LetterStatus): void {
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
  ): Promise<void> {
    await this.notifier.send(userIds, {
      type: 'LETTER',
      title,
      body: body ?? null,
      link: `/dashboard/letters/${letter.id}`,
    });
  }

  private async loadLetterWithRelations(id: number): Promise<Letter> {
    const letter = await this.lettersRepo.findOne({
      where: { id },
      relations: ['template', 'subjectUser', 'subjectUser.department', 'preparedByUser'],
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
    const template = await this.findTemplateEntityOrThrow(dto.templateId);
    await this.usersService.findOneEntity(dto.subjectUserId); // 404s if the subject doesn't exist

    const letter = this.lettersRepo.create({
      templateId: template.id,
      type: template.type,
      subjectUserId: dto.subjectUserId,
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

  async updateLetter(id: number, dto: UpdateLetterDto): Promise<LetterDto> {
    const letter = await this.findLetterOrThrow(id);
    if (letter.status !== LetterStatus.DRAFT && letter.status !== LetterStatus.CHANGES_REQUESTED) {
      throw new ConflictException(
        `Cannot edit a letter in status ${letter.status} — only DRAFT or CHANGES_REQUESTED`,
      );
    }
    letter.fieldValues = dto.fieldValues;
    await this.lettersRepo.save(letter);
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
      letter.subjectUser,
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

  private findSubjectProfile(letter: Letter): Promise<EmployeeProfile | null> {
    return this.profilesRepo.findOne({ where: { userId: letter.subjectUserId } });
  }

  private async computeDocumentHash(letter: Letter, template: LetterTemplate): Promise<string> {
    const resolved = resolveLetterFieldValues(
      template.fieldsSchema,
      letter.fieldValues ?? {},
      letter.subjectUser,
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
      `The CEO signed ${letter.template.name} for ${letterSubject(letter)} — ready to send to the employee`,
      letter,
    );
    return toLetterDto(await this.loadLetterWithRelations(id));
  }

  async sendToEmployee(
    id: number,
    message: string | null,
    caller: JwtUserPayload,
  ): Promise<LetterDto> {
    const letter = await this.loadLetterWithRelations(id);
    if (letter.status !== LetterStatus.CEO_SIGNED) {
      throw new ConflictException(
        `Cannot send a letter in status ${letter.status} to the employee — must be CEO_SIGNED`,
      );
    }
    letter.status = LetterStatus.SENT_TO_EMPLOYEE;
    await this.lettersRepo.save(letter);
    // Optional HR note, shown to the employee on the letter's timeline (same event.comment
    // pattern the frontend already renders for CHANGES_REQUESTED) — see docs/API_CONTRACT_SPRINT3.md
    // addendum "Send to employee message".
    await this.logEvent(id, caller.sub, LetterEventAction.SENT_TO_EMPLOYEE, message);

    await this.notifyLetter(
      [letter.subjectUserId],
      `You have a letter to sign: ${letter.template.name}`,
      letter,
      message,
    );

    return toLetterDto(await this.loadLetterWithRelations(id));
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

    await this.notifyLetter(
      [
        letter.preparedBy,
        ...(await this.notifier.activeUserIds([RoleName.HR, RoleName.ADMIN], caller.sub)),
      ],
      `${letterSubject(letter)} signed ${letter.template.name}`,
      letter,
      'The signed copy has been filed in their E-record.',
    );

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
