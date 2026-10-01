import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from '../entities/announcement.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { AnnouncementAudience } from '../common/enums/announcement-audience.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

/** Roles that can post announcements (guide §4: HR, CEO, ADMIN). */
export const ANNOUNCEMENT_POSTER_ROLES = [RoleName.CEO, RoleName.ADMIN, RoleName.HR];

export interface AnnouncementDto {
  id: number;
  title: string;
  body: string;
  postedBy: number | null;
  posterName: string | null;
  posterRole: string | null;
  audience: string;
  departmentId: number | null;
  departmentName: string | null;
  pinned: boolean;
  expiresOn: string | null;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Today's date as 'YYYY-MM-DD' in the server's local timezone. */
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function toDto(row: Announcement): AnnouncementDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    postedBy: row.postedBy,
    posterName: row.poster ? `${row.poster.firstName} ${row.poster.lastName}` : null,
    posterRole: row.poster?.role ?? null,
    audience: row.audience,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    pinned: row.pinned,
    expiresOn: row.expiresOn,
    isExpired: !!row.expiresOn && row.expiresOn < todayLocal(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly repo: Repository<Announcement>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  private canPost(caller: JwtUserPayload): boolean {
    return (ANNOUNCEMENT_POSTER_ROLES as string[]).includes(caller.role);
  }

  /**
   * What the caller should see: company-wide ones plus their department's, pinned first, newest
   * first. Expired ones are hidden unless a poster asks for them (`includeExpired`).
   */
  async list(
    caller: JwtUserPayload,
    opts: { includeExpired?: boolean; limit?: number },
  ): Promise<AnnouncementDto[]> {
    const me = await this.usersRepo.findOne({ where: { id: caller.sub } });
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.poster', 'poster')
      .leftJoinAndSelect('a.department', 'department')
      .orderBy('a.pinned', 'DESC')
      .addOrderBy('a.createdAt', 'DESC');

    // Posters see every announcement (to manage them); everyone else only what's addressed to them.
    if (!this.canPost(caller)) {
      qb.andWhere(
        '(a.audience = :all OR (a.audience = :dept AND a.departmentId = :departmentId))',
        {
          all: AnnouncementAudience.ALL,
          dept: AnnouncementAudience.DEPARTMENT,
          departmentId: me?.departmentId ?? -1,
        },
      );
    }
    if (!(opts.includeExpired && this.canPost(caller))) {
      qb.andWhere('(a.expiresOn IS NULL OR a.expiresOn >= :today)', { today: todayLocal() });
    }
    if (opts.limit) qb.take(opts.limit);
    return (await qb.getMany()).map(toDto);
  }

  private async findOrThrow(id: number): Promise<Announcement> {
    const row = await this.repo.findOne({ where: { id }, relations: ['poster', 'department'] });
    if (!row) throw new NotFoundException('Announcement not found');
    return row;
  }

  async create(dto: CreateAnnouncementDto, caller: JwtUserPayload): Promise<AnnouncementDto> {
    const audience = dto.audience ?? AnnouncementAudience.ALL;
    if (audience === AnnouncementAudience.DEPARTMENT && !dto.departmentId) {
      throw new BadRequestException('Choose the department this announcement is for');
    }
    const saved = await this.repo.save(
      this.repo.create({
        title: dto.title.trim(),
        body: dto.body.trim(),
        postedBy: caller.sub,
        audience,
        departmentId: audience === AnnouncementAudience.DEPARTMENT ? dto.departmentId! : null,
        pinned: !!dto.pinned,
        expiresOn: dto.expiresOn ?? null,
      }),
    );
    await this.notifyAudience(saved);
    return toDto(await this.findOrThrow(saved.id));
  }

  /** In-app notification + (stubbed) email to every active user the announcement is addressed to. */
  private async notifyAudience(row: Announcement): Promise<void> {
    const recipients = await this.usersRepo.find({
      where:
        row.audience === AnnouncementAudience.DEPARTMENT
          ? { status: UserStatus.ACTIVE, departmentId: row.departmentId! }
          : { status: UserStatus.ACTIVE },
    });
    const others = recipients.filter((user) => user.id !== row.postedBy);
    if (others.length) {
      await this.notificationsRepo.save(
        others.map((user) =>
          this.notificationsRepo.create({
            userId: user.id,
            type: 'ANNOUNCEMENT',
            title: row.title,
            body: row.body.length > 280 ? `${row.body.slice(0, 277)}...` : row.body,
            link: '/dashboard/announcements',
          }),
        ),
      );
    }

    // STUB: replace with a real mail service call (SMTP) once B8 is resolved with the client —
    // same stub pattern as the letter engine's emails.
    // eslint-disable-next-line no-console
    console.log(
      `[stub email] Announcement "${row.title}" -> ${others.length} recipient(s): ` +
        others.map((user) => user.email).join(', '),
    );
    await this.repo.update(row.id, { emailSentAt: new Date() });
  }

  private assertCanManage(row: Announcement, caller: JwtUserPayload): void {
    if (row.postedBy !== caller.sub && caller.role !== RoleName.ADMIN) {
      throw new ForbiddenException('Only the person who posted this (or an Admin) can change it');
    }
  }

  async update(
    id: number,
    dto: UpdateAnnouncementDto,
    caller: JwtUserPayload,
  ): Promise<AnnouncementDto> {
    const row = await this.findOrThrow(id);
    this.assertCanManage(row, caller);
    const audience = dto.audience ?? row.audience;
    const departmentId =
      audience === AnnouncementAudience.DEPARTMENT
        ? dto.departmentId !== undefined
          ? dto.departmentId
          : row.departmentId
        : null;
    if (audience === AnnouncementAudience.DEPARTMENT && !departmentId) {
      throw new BadRequestException('Choose the department this announcement is for');
    }
    await this.repo.update(id, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
      ...(dto.pinned !== undefined ? { pinned: dto.pinned } : {}),
      ...(dto.expiresOn !== undefined ? { expiresOn: dto.expiresOn } : {}),
      audience,
      departmentId,
    });
    return toDto(await this.findOrThrow(id));
  }

  async remove(id: number, caller: JwtUserPayload): Promise<void> {
    const row = await this.findOrThrow(id);
    this.assertCanManage(row, caller);
    await this.repo.delete(id);
  }
}
