import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../entities/user.entity';
import { EmployeeDocument } from '../entities/employee-document.entity';
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
  joinDate: string | null;
  documentCount: number;
}

@Injectable()
export class StaffSummaryService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EmployeeDocument)
    private readonly employeeDocumentsRepo: Repository<EmployeeDocument>,
  ) {}

  private buildFilteredQuery(query: QueryStaffSummaryDto): SelectQueryBuilder<User> {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.manager', 'manager')
      .leftJoinAndSelect('user.department', 'department');

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
    if (query.departmentId) {
      qb.andWhere('user.departmentId = :departmentId', { departmentId: query.departmentId });
    }

    return qb.orderBy('user.createdAt', 'DESC');
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

  private toRow(user: User, documentCount: number): StaffSummaryRowDto {
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
      joinDate: user.joinDate,
      documentCount,
    };
  }

  async findAll(
    query: QueryStaffSummaryDto,
  ): Promise<{ data: StaffSummaryRowDto[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.buildFilteredQuery(query)
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const counts = await this.getDocumentCounts(rows.map((r) => r.id));

    return {
      data: rows.map((r) => this.toRow(r, counts.get(r.id) ?? 0)),
      meta: { total, page, limit },
    };
  }

  /** No pagination — used by GET /staff-summary/export, same filters as findAll. */
  async findAllForExport(query: QueryStaffSummaryDto): Promise<StaffSummaryRowDto[]> {
    const rows = await this.buildFilteredQuery(query).getMany();
    const counts = await this.getDocumentCounts(rows.map((r) => r.id));
    return rows.map((r) => this.toRow(r, counts.get(r.id) ?? 0));
  }
}
