import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../entities/user.entity';
import { EmployeeDocument } from '../entities/employee-document.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { QueryStaffSummaryDto } from './dto/query-staff-summary.dto';

export interface StaffSummaryRowDto {
  id: number;
  employeeCode: string | null;
  fullName: string;
  email: string;
  role: string;
  departmentName: string | null;
  designation: string | null;
  managerName: string | null;
  status: string;
  employmentType: string;
  /** employee_profiles.phone — null when not filled in. */
  contactNumber: string | null;
  joinDate: string | null;
  documentCount: number;
}

@Injectable()
export class StaffSummaryService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EmployeeDocument)
    private readonly employeeDocumentsRepo: Repository<EmployeeDocument>,
    @InjectRepository(EmployeeProfile)
    private readonly employeeProfilesRepo: Repository<EmployeeProfile>,
  ) {}

  private buildFilteredQuery(query: QueryStaffSummaryDto): SelectQueryBuilder<User> {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.manager', 'manager')
      .leftJoinAndSelect('user.department', 'department')
      // One profile row per user (unique user_id), so this never duplicates rows. Only used for
      // sorting here — the phone itself is loaded separately, like the document counts.
      .leftJoin(EmployeeProfile, 'profile', 'profile.user_id = user.id');

    if (query.q) {
      qb.andWhere(
        '(user.firstName ILIKE :q OR user.lastName ILIKE :q OR user.email ILIKE :q OR user.employeeCode ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.employmentType) {
      qb.andWhere('user.employmentType = :employmentType', {
        employmentType: query.employmentType,
      });
    }
    if (query.departmentId) {
      qb.andWhere('user.departmentId = :departmentId', { departmentId: query.departmentId });
    }

    return this.applySort(qb, query);
  }

  private applySort(
    qb: SelectQueryBuilder<User>,
    query: QueryStaffSummaryDto,
  ): SelectQueryBuilder<User> {
    const direction = query.order === 'desc' ? 'DESC' : 'ASC';
    const nulls = 'NULLS LAST';

    switch (query.sortBy) {
      case 'name':
        return qb.orderBy('user.firstName', direction).addOrderBy('user.lastName', direction);
      case 'employeeCode':
        return qb.orderBy('user.employeeCode', direction, nulls);
      case 'email':
        return qb.orderBy('user.email', direction);
      case 'contactNumber':
        return qb.orderBy('profile.phone', direction, nulls);
      case 'department':
        return qb.orderBy('department.name', direction, nulls);
      case 'designation':
        return qb.orderBy('user.designation', direction, nulls);
      case 'manager':
        return qb
          .orderBy('manager.firstName', direction, nulls)
          .addOrderBy('manager.lastName', direction, nulls);
      // role/status are Postgres enums, which sort in declaration order — cast to sort A–Z.
      case 'role':
        return qb.addSelect('CAST(user.role AS text)', 'role_sort').orderBy('role_sort', direction);
      case 'joinDate':
        return qb.orderBy('user.joinDate', direction, nulls);
      case 'status':
        return qb
          .addSelect('CAST(user.status AS text)', 'status_sort')
          .orderBy('status_sort', direction);
      case 'employmentType':
        return qb
          .addSelect('CAST(user.employmentType AS text)', 'employment_type_sort')
          .orderBy('employment_type_sort', direction);
      case 'documentCount':
        return qb
          .addSelect(
            (sub) =>
              sub
                .select('COUNT(*)')
                .from(EmployeeDocument, 'doc')
                .where('doc.user_id = user.id'),
            'document_count',
          )
          .orderBy('document_count', direction);
      default:
        return qb.orderBy('user.createdAt', 'DESC');
    }
  }

  private async getDocumentCounts(userIds: number[]): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (userIds.length === 0) {
      return counts;
    }
    const rows = await this.employeeDocumentsRepo
      .createQueryBuilder('doc')
      .select('doc.user_id', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('doc.user_id IN (:...userIds)', { userIds })
      .groupBy('doc.user_id')
      .getRawMany<{ userId: number; count: string }>();
    for (const row of rows) {
      counts.set(Number(row.userId), Number(row.count));
    }
    return counts;
  }

  private async getContactNumbers(userIds: number[]): Promise<Map<number, string | null>> {
    if (userIds.length === 0) return new Map();
    const profiles = await this.employeeProfilesRepo.find({ where: { userId: In(userIds) } });
    return new Map(profiles.map((profile) => [profile.userId, profile.phone]));
  }

  private toRow(
    user: User,
    documentCount: number,
    contactNumber: string | null,
  ): StaffSummaryRowDto {
    return {
      id: user.id,
      employeeCode: user.employeeCode,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      departmentName: user.department ? user.department.name : null,
      designation: user.designation,
      managerName: user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : null,
      status: user.status,
      employmentType: user.employmentType,
      contactNumber,
      joinDate: user.joinDate,
      documentCount,
    };
  }

  async findAll(
    query: QueryStaffSummaryDto,
  ): Promise<{ data: StaffSummaryRowDto[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    // offset/limit rather than skip/take: manager and department are many-to-one, so rows never
    // duplicate, and skip/take's distinct-subquery path can't order by the document-count alias.
    const qb = this.buildFilteredQuery(query)
      .offset((page - 1) * limit)
      .limit(limit);

    const [rows, total] = await qb.getManyAndCount();
    const ids = rows.map((r) => r.id);
    const [counts, phones] = await Promise.all([
      this.getDocumentCounts(ids),
      this.getContactNumbers(ids),
    ]);

    return {
      data: rows.map((r) => this.toRow(r, counts.get(r.id) ?? 0, phones.get(r.id) ?? null)),
      meta: { total, page, limit },
    };
  }

  /** No pagination — used by GET /staff-summary/export, same filters as findAll. */
  async findAllForExport(query: QueryStaffSummaryDto): Promise<StaffSummaryRowDto[]> {
    const rows = await this.buildFilteredQuery(query).getMany();
    const ids = rows.map((r) => r.id);
    const [counts, phones] = await Promise.all([
      this.getDocumentCounts(ids),
      this.getContactNumbers(ids),
    ]);
    return rows.map((r) => this.toRow(r, counts.get(r.id) ?? 0, phones.get(r.id) ?? null));
  }
}
