import { randomUUID } from 'crypto';
import { basename, extname, join } from 'path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '../entities/candidate.entity';
import { CandidateStatus } from '../common/enums/candidate-status.enum';
import { DocumentSource } from '../common/enums/document-source.enum';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserDto } from '../common/mappers/user.mapper';
import { CandidateDto, toCandidateDto } from '../common/mappers/candidate.mapper';
import { EmployeesService } from '../employees/employees.service';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { ConvertCandidateDto } from './dto/convert-candidate.dto';

/** Turns "John_Doe_CV (2).pdf" into "John Doe CV (2)" — a reasonable starting name, per the
 * contract's "name defaulted from the filename (HR edits it after)". */
function nameFromFilename(originalName: string): string {
  const withoutExt = basename(originalName, extname(originalName));
  return withoutExt.replace(/[_-]+/g, ' ').trim() || 'Unnamed candidate';
}

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate) private readonly candidatesRepo: Repository<Candidate>,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
  ) {}

  private async loadWithRelations(id: number): Promise<Candidate> {
    const candidate = await this.candidatesRepo.findOne({
      where: { id },
      relations: ['uploadedByUser'],
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  /**
   * POST /candidates/bulk-upload — one Candidate row per uploaded PDF, status NEW. The contract
   * doesn't specify where `email` comes from (a CV file has no structured email field without
   * parsing, which is out of scope) — this implementation generates a unique placeholder
   * `candidate-<random>@pending.local` address that HR edits via PATCH before converting (see
   * final report's "deviation" note).
   */
  async bulkUpload(files: Express.Multer.File[], uploadedBy: number): Promise<CandidateDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one CV file is required (field "files")');
    }

    const created: Candidate[] = [];
    for (const file of files) {
      const candidate = this.candidatesRepo.create({
        name: nameFromFilename(file.originalname),
        email: `candidate-${randomUUID().slice(0, 8)}@pending.local`,
        phone: null,
        cvFilePath: join('candidate-cvs', file.filename),
        cvOriginalName: file.originalname,
        cvMime: file.mimetype,
        cvSize: file.size,
        status: CandidateStatus.NEW,
        uploadedBy,
      });
      created.push(await this.candidatesRepo.save(candidate));
    }

    const ids = created.map((c) => c.id);
    const full = await this.candidatesRepo.find({
      where: ids.map((id) => ({ id })),
      relations: ['uploadedByUser'],
      order: { id: 'ASC' },
    });
    return full.map(toCandidateDto);
  }

  async findAll(
    query: QueryCandidatesDto,
  ): Promise<{ data: CandidateDto[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.candidatesRepo
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.uploadedByUser', 'uploadedByUser');

    if (query.status) {
      qb.andWhere('candidate.status = :status', { status: query.status });
    }
    if (query.q) {
      qb.andWhere('(candidate.name ILIKE :q OR candidate.email ILIKE :q)', { q: `%${query.q}%` });
    }

    qb.orderBy('candidate.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toCandidateDto), meta: { total, page, limit } };
  }

  async findOne(id: number): Promise<CandidateDto> {
    return toCandidateDto(await this.loadWithRelations(id));
  }

  async update(id: number, dto: UpdateCandidateDto): Promise<CandidateDto> {
    const candidate = await this.loadWithRelations(id);

    if (dto.status !== undefined && candidate.status === CandidateStatus.HIRED) {
      throw new ConflictException(
        'This candidate has already been converted to an employee (HIRED) — status can no longer be changed manually',
      );
    }

    if (dto.name !== undefined) candidate.name = dto.name;
    if (dto.email !== undefined) candidate.email = dto.email;
    if (dto.phone !== undefined) candidate.phone = dto.phone;
    if (dto.status !== undefined) candidate.status = dto.status;

    await this.candidatesRepo.save(candidate);
    return toCandidateDto(await this.loadWithRelations(id));
  }

  async getCvForDownload(id: number): Promise<{ candidate: Candidate; absolutePath: string }> {
    const candidate = await this.candidatesRepo.findOne({ where: { id } });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return { candidate, absolutePath: join(UPLOADS_ROOT_DIR, candidate.cvFilePath) };
  }

  /**
   * POST /candidates/:id/convert — creates a real User via UsersService.create() (reused as-is,
   * including its own 409 on email collision), sets candidate.status = HIRED and
   * convertedUserId, and copies the candidate's CV into the new employee's E-record (H1 "CVs are
   * retained in employee E-record") via EmployeesService.attachExistingFile. Returns
   * { candidate, user }.
   */
  async convert(
    id: number,
    dto: ConvertCandidateDto,
    convertedBy: number,
  ): Promise<{ candidate: CandidateDto; user: UserDto }> {
    const candidate = await this.loadWithRelations(id);

    if (candidate.status === CandidateStatus.HIRED) {
      throw new ConflictException('This candidate has already been converted to an employee');
    }

    const [defaultFirstName, ...rest] = candidate.name.trim().split(/\s+/);
    const defaultLastName = rest.join(' ');

    const createUserDto: CreateUserDto = {
      firstName: dto.firstName ?? defaultFirstName ?? candidate.name,
      lastName: dto.lastName ?? (defaultLastName || defaultFirstName || candidate.name),
      email: dto.email ?? candidate.email,
      role: dto.role,
      managerId: dto.managerId,
      departmentId: dto.departmentId,
      designation: dto.designation,
      joinDate: dto.joinDate,
      employeeCode: dto.employeeCode,
      password: dto.password,
    };

    // UsersService.create() throws its own ConflictException (409) on a duplicate email — let it
    // propagate as-is, per the contract's "same check UsersService.create already does" note.
    const { user } = await this.usersService.create(createUserDto);

    candidate.status = CandidateStatus.HIRED;
    candidate.convertedUserId = user.id;
    await this.candidatesRepo.save(candidate);

    // Best-effort: the new account is the important part and must not be rolled back just
    // because the E-record copy hiccups (e.g. the source file was somehow already gone) — the CV
    // stays downloadable from the candidate record either way.
    try {
      await this.employeesService.attachExistingFile({
        employeeId: user.id,
        documentTypeName: 'CV',
        sourceAbsolutePath: join(UPLOADS_ROOT_DIR, candidate.cvFilePath),
        originalName: candidate.cvOriginalName,
        mime: candidate.cvMime,
        size: candidate.cvSize,
        source: DocumentSource.CV,
        uploadedBy: convertedBy,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[candidates] failed to copy CV into E-record for user ${user.id}:`, err);
    }

    return { candidate: toCandidateDto(await this.loadWithRelations(id)), user };
  }
}
