import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from '../entities/complaint.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { ComplaintStatus } from '../common/enums/complaint-status.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { ComplaintDto, toComplaintDto } from '../common/mappers/complaint.mapper';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { HrResponseDto } from './dto/hr-response.dto';
import { QueryComplaintsDto } from './dto/query-complaints.dto';

// Can see every complaint. Only HR/ADMIN fill in the "HR Department Only" section.
const VIEW_ALL_ROLES: string[] = [RoleName.HR, RoleName.ADMIN, RoleName.CEO];
const RELATIONS = ['complainant', 'complainant.department', 'hrRepresentative'];

export type ComplaintListResult = {
  data: ComplaintDto[];
  meta: { total: number; page: number; limit: number };
};

/** Trims a free-text value; empty becomes null. `undefined` stays undefined (= "not sent"). */
function clean(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint) private readonly complaintsRepo: Repository<Complaint>,
    @InjectRepository(EmployeeProfile)
    private readonly profilesRepo: Repository<EmployeeProfile>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  async findEntityForViewer(id: number, caller: JwtUserPayload): Promise<Complaint> {
    const complaint = await this.complaintsRepo.findOne({ where: { id }, relations: RELATIONS });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    if (complaint.complainantId !== caller.sub && !VIEW_ALL_ROLES.includes(caller.role)) {
      throw new ForbiddenException('You do not have access to this complaint');
    }
    return complaint;
  }

  async create(dto: CreateComplaintDto, caller: JwtUserPayload): Promise<ComplaintDto> {
    const values = {
      description: clean(dto.description) ?? null,
      accessoryType: clean(dto.accessoryType) ?? null,
      accessoryDescription: clean(dto.accessoryDescription) ?? null,
      accessoryIssue: clean(dto.accessoryIssue) ?? null,
      maintenanceArea: clean(dto.maintenanceArea) ?? null,
      maintenanceDescription: clean(dto.maintenanceDescription) ?? null,
    };
    if (!Object.values(values).some(Boolean)) {
      throw new BadRequestException(
        'Fill in at least one section: complaint details, office accessories or maintenance issue',
      );
    }

    // Default the contact number to the phone on the complainant's E-record profile.
    let contactNumber = clean(dto.contactNumber) ?? null;
    if (!contactNumber) {
      const profile = await this.profilesRepo.findOne({ where: { userId: caller.sub } });
      contactNumber = profile?.phone ?? null;
    }

    const saved = await this.complaintsRepo.save(
      this.complaintsRepo.create({ ...values, contactNumber, complainantId: caller.sub }),
    );
    const complaint = await this.findEntityForViewer(saved.id, caller);
    await this.notifyHr(complaint);
    return toComplaintDto(complaint);
  }

  /** In-app notification to every active HR user (email is still stubbed project-wide). */
  private async notifyHr(complaint: Complaint): Promise<void> {
    const hrUsers = await this.usersRepo.find({
      where: { role: RoleName.HR, status: UserStatus.ACTIVE },
    });
    const name = `${complaint.complainant.firstName} ${complaint.complainant.lastName}`;
    await this.notificationsRepo.save(
      hrUsers
        .filter((hr) => hr.id !== complaint.complainantId)
        .map((hr) =>
          this.notificationsRepo.create({
            userId: hr.id,
            type: 'COMPLAINT_SUBMITTED',
            title: `New complaint from ${name}`,
            body: complaint.description ?? complaint.accessoryType ?? complaint.maintenanceArea,
            link: `/dashboard/complaints/${complaint.id}`,
          }),
        ),
    );
  }

  private async list(
    query: QueryComplaintsDto,
    complainantId: number | null,
  ): Promise<ComplaintListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.complaintsRepo
      .createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.complainant', 'complainant')
      .leftJoinAndSelect('complainant.department', 'department')
      .leftJoinAndSelect('complaint.hrRepresentative', 'hrRepresentative')
      .orderBy('complaint.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (complainantId !== null) {
      qb.andWhere('complaint.complainantId = :complainantId', { complainantId });
    }
    if (query.status) {
      qb.andWhere('complaint.status = :status', { status: query.status });
    }
    if (query.q && complainantId === null) {
      qb.andWhere(
        "(complainant.firstName || ' ' || complainant.lastName) ILIKE :q OR complainant.email ILIKE :q",
        { q: `%${query.q.trim()}%` },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toComplaintDto), meta: { total, page, limit } };
  }

  mine(query: QueryComplaintsDto, caller: JwtUserPayload): Promise<ComplaintListResult> {
    return this.list(query, caller.sub);
  }

  listAll(query: QueryComplaintsDto): Promise<ComplaintListResult> {
    return this.list(query, null);
  }

  async getOne(id: number, caller: JwtUserPayload): Promise<ComplaintDto> {
    return toComplaintDto(await this.findEntityForViewer(id, caller));
  }

  async hrResponse(id: number, dto: HrResponseDto, caller: JwtUserPayload): Promise<ComplaintDto> {
    const complaint = await this.findEntityForViewer(id, caller);
    const patch: Partial<Complaint> = {};

    const comments = clean(dto.comments);
    const actionRequested = clean(dto.actionRequested);
    const acknowledgement = clean(dto.acknowledgement);
    if (comments !== undefined) patch.hrComments = comments;
    if (actionRequested !== undefined) patch.hrActionRequested = actionRequested;
    if (acknowledgement !== undefined) patch.hrAcknowledgement = acknowledgement;

    const signatureText = clean(dto.signatureText);
    if (signatureText) {
      patch.hrSignatureText = signatureText;
      patch.hrRepresentativeId = caller.sub;
      patch.hrSignedAt = new Date();
    }

    if (dto.status) {
      patch.status = dto.status;
    } else if (complaint.status === ComplaintStatus.SUBMITTED) {
      // Any HR response means it's being worked on.
      patch.status = ComplaintStatus.IN_PROGRESS;
    }

    await this.complaintsRepo.update(id, patch);
    return this.getOne(id, caller);
  }
}
