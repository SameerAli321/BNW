import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingForm } from '../entities/onboarding-form.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { DocumentType } from '../entities/document-type.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { OnboardingFormStatus } from '../common/enums/onboarding-form-status.enum';
import { DocumentSource } from '../common/enums/document-source.enum';
import { RoleName } from '../common/enums/role.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { OnboardingFormDto, toOnboardingFormDto } from '../common/mappers/onboarding-form.mapper';
import { EmployeesService } from '../employees/employees.service';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';
import { OnboardingFormPdfService } from './onboarding-form-pdf.service';
import { SubmitOnboardingFormDto } from './dto/submit-onboarding-form.dto';
import { HrRecordDto } from './dto/hr-record.dto';
import { QueryOnboardingFormsDto } from './dto/query-onboarding-forms.dto';
import { RequestWatchersService } from '../notifications/request-watchers.service';
import { NotifyService } from '../notifications/notify.service';

const VIEW_ALL_ROLES: string[] = [RoleName.HR, RoleName.ADMIN, RoleName.CEO];
const RELATIONS = ['user', 'user.department', 'hrUser'];
const ONBOARDING_DIR = join(UPLOADS_ROOT_DIR, 'onboarding-forms');

// The employee-typed columns, in form order.
const FORM_FIELDS = [
  'dateOfBirth',
  'nationalId',
  'streetAddress',
  'city',
  'state',
  'zipCode',
  'phone',
  'reasonForLeaving',
  'workResponsibilities',
  'emergencyContactName',
  'emergencyContactRelationship',
  'emergencyContactPhone',
  'emergencyContactAddress',
  'bankName',
  'accountTitle',
  'accountNumber',
  'iban',
  'medicalCondition',
] as const;

/** Values from the E-record profile to pre-fill a first-time form with. */
export type OnboardingPrefill = Partial<Record<(typeof FORM_FIELDS)[number], string | null>>;

@Injectable()
export class OnboardingFormsService {
  constructor(
    @InjectRepository(OnboardingForm) private readonly formsRepo: Repository<OnboardingForm>,
    @InjectRepository(EmployeeProfile)
    private readonly profilesRepo: Repository<EmployeeProfile>,
    @InjectRepository(DocumentType) private readonly documentTypesRepo: Repository<DocumentType>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    private readonly employeesService: EmployeesService,
    private readonly pdfService: OnboardingFormPdfService,
    private readonly requestWatchers: RequestWatchersService,
    private readonly notifier: NotifyService,
  ) {}

  async findEntityForViewer(id: number, caller: JwtUserPayload): Promise<OnboardingForm> {
    const form = await this.formsRepo.findOne({ where: { id }, relations: RELATIONS });
    if (!form) {
      throw new NotFoundException('Onboarding form not found');
    }
    if (form.userId !== caller.sub && !VIEW_ALL_ROLES.includes(caller.role)) {
      throw new ForbiddenException('You do not have access to this onboarding form');
    }
    return form;
  }

  /** The caller's own form (null if not submitted yet) plus E-record values to pre-fill with. */
  async getMine(
    caller: JwtUserPayload,
  ): Promise<{ data: OnboardingFormDto | null; prefill: OnboardingPrefill }> {
    const form = await this.formsRepo.findOne({
      where: { userId: caller.sub },
      relations: RELATIONS,
    });
    const profile = await this.profilesRepo.findOne({ where: { userId: caller.sub } });
    return {
      data: form ? toOnboardingFormDto(form) : null,
      prefill: {
        dateOfBirth: profile?.dateOfBirth ?? null,
        nationalId: profile?.nationalId ?? null,
        streetAddress: profile?.address ?? null,
        phone: profile?.phone ?? null,
        emergencyContactName: profile?.emergencyContactName ?? null,
        emergencyContactPhone: profile?.emergencyContactPhone ?? null,
        bankName: profile?.bankName ?? null,
        accountNumber: profile?.bankAccountNumber ?? null,
      },
    };
  }

  async submitMine(
    dto: SubmitOnboardingFormDto,
    caller: JwtUserPayload,
  ): Promise<OnboardingFormDto> {
    const values: Partial<OnboardingForm> = {};
    for (const key of FORM_FIELDS) {
      const value = dto[key]?.trim();
      values[key] = value ? value : null;
    }

    let form = await this.formsRepo.findOne({ where: { userId: caller.sub } });
    if (form?.status === OnboardingFormStatus.RECORDED) {
      throw new ConflictException(
        'HR has already recorded your onboarding form — ask HR to change it',
      );
    }
    const isFirstSubmit = !form;
    form = this.formsRepo.merge(form ?? this.formsRepo.create({ userId: caller.sub }), {
      ...values,
      employeeSignatureText: dto.signatureText.trim(),
      employeeSignedAt: new Date(),
      status: OnboardingFormStatus.SUBMITTED,
    });
    const saved = await this.formsRepo.save(form);

    await this.syncProfile(caller.sub, saved);
    if (isFirstSubmit) {
      await this.notifyHr(caller.sub, saved.id);
      const submitter = await this.usersRepo.findOne({ where: { id: caller.sub } });
      this.requestWatchers.notifyNewRequest({
        requesterId: caller.sub,
        requesterName: submitter ? `${submitter.firstName} ${submitter.lastName}` : 'An employee',
        kind: 'Onboarding form',
        summary: 'Onboarding form submitted for HR to record',
        link: `/dashboard/onboarding-forms/${saved.id}`,
      });
    }
    return this.getOne(saved.id, caller);
  }

  /** Copies the fields the E-record profile also has into it (only ones the employee filled in). */
  private async syncProfile(userId: number, form: OnboardingForm): Promise<void> {
    const address = [
      form.streetAddress,
      form.city,
      [form.state, form.zipCode].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ');
    const updates: Partial<EmployeeProfile> = {
      phone: form.phone,
      address: address || null,
      dateOfBirth: form.dateOfBirth,
      nationalId: form.nationalId,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      bankName: form.bankName,
      bankAccountNumber: form.accountNumber,
    };
    const filled = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== null && value !== ''),
    ) as Partial<EmployeeProfile>;
    if (!Object.keys(filled).length) return;

    const profile = await this.profilesRepo.findOne({ where: { userId } });
    await this.profilesRepo.save(
      this.profilesRepo.merge(profile ?? this.profilesRepo.create({ userId }), filled),
    );
  }

  private async notifyHr(userId: number, formId: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    await this.notifier.send(
      await this.notifier.activeUserIds([RoleName.HR, RoleName.ADMIN], userId),
      {
        type: 'ONBOARDING_FORM_SUBMITTED',
        title:
          `Onboarding form submitted by ${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        link: `/dashboard/onboarding-forms/${formId}`,
      },
    );
  }

  async listAll(query: QueryOnboardingFormsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.formsRepo
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.user', 'user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('form.hrUser', 'hrUser')
      .orderBy('form.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.status) {
      qb.andWhere('form.status = :status', { status: query.status });
    }
    if (query.q) {
      qb.andWhere(
        "((user.firstName || ' ' || user.lastName) ILIKE :q OR user.email ILIKE :q OR user.employeeCode ILIKE :q)",
        { q: `%${query.q.trim()}%` },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toOnboardingFormDto), meta: { total, page, limit } };
  }

  async getOne(id: number, caller: JwtUserPayload): Promise<OnboardingFormDto> {
    return toOnboardingFormDto(await this.findEntityForViewer(id, caller));
  }

  /** HRD Use Only: records the form and files its PDF into the employee's E-record documents. */
  async hrRecord(id: number, dto: HrRecordDto, caller: JwtUserPayload): Promise<OnboardingFormDto> {
    const form = await this.findEntityForViewer(id, caller);
    if (form.status === OnboardingFormStatus.RECORDED) {
      throw new ConflictException('This onboarding form has already been recorded');
    }
    const documentType = await this.documentTypesRepo.findOne({
      where: { name: 'Onboarding Form' },
    });
    if (!documentType) {
      throw new BadRequestException(
        'Document type "Onboarding Form" is missing — run the migrations',
      );
    }

    await this.formsRepo.update(id, {
      hrRecordedTo: dto.recordedTo?.trim() || null,
      hrComments: dto.comments?.trim() || null,
      hrUserId: caller.sub,
      hrSignatureText: dto.signatureText.trim(),
      hrSignedAt: new Date(),
      status: OnboardingFormStatus.RECORDED,
    });

    if (form.userId !== caller.sub) {
      await this.notifier.send([form.userId], {
        type: 'ONBOARDING_FORM_RECORDED',
        title: 'HR has recorded your onboarding form',
        body: dto.comments?.trim() || null,
        link: `/dashboard/onboarding-forms/${id}`,
      });
    }
    const recorded = await this.findEntityForViewer(id, caller);
    const bytes = await this.pdfService.render(recorded);
    if (!existsSync(ONBOARDING_DIR)) mkdirSync(ONBOARDING_DIR, { recursive: true });
    const relativePath = join('onboarding-forms', `${randomUUID()}.pdf`);
    await writeFile(join(UPLOADS_ROOT_DIR, relativePath), bytes);
    await this.employeesService.fileGeneratedDocument({
      employeeId: form.userId,
      documentTypeId: documentType.id,
      filePath: relativePath,
      originalName: `Onboarding Form - ${form.user.firstName} ${form.user.lastName}.pdf`,
      mime: 'application/pdf',
      size: bytes.length,
      source: DocumentSource.ONBOARDING,
      uploadedBy: caller.sub,
    });

    return toOnboardingFormDto(recorded);
  }
}
