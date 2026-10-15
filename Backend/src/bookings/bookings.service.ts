import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingParticipant } from '../entities/booking-participant.entity';
import { BookingResource } from '../entities/booking-resource.entity';
import { User } from '../entities/user.entity';
import { BookingResourceType, BookingStatus, BookingType } from '../common/enums/booking.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import {
  BOOKING_ADMIN_ROLES,
  BookingDto,
  BookingResourceDto,
  isBookingInvolved,
  toBookingDto,
  toBookingResourceDto,
} from '../common/mappers/booking.mapper';
import { NotifyService } from '../notifications/notify.service';
import { MailService } from '../mail/mail.service';
import { buildIcs } from '../mail/ics';
import {
  AvailabilityQueryDto,
  CreateBookingDto,
  CreateBookingResourceDto,
  QueryBookingResourcesDto,
  QueryBookingsDto,
  UpdateBookingDto,
  UpdateBookingResourceDto,
} from './dto/booking.dto';
import {
  addMinutes,
  formatBookingWhen,
  formatDuration,
  pktDayRange,
  pktToDate,
} from './booking-time';

/** Who may organise meetings (Team Members only attend). */
export const MEETING_ORGANIZER_ROLES: string[] = [
  RoleName.CEO,
  RoleName.HR,
  RoleName.ADMIN,
  RoleName.MANAGER,
];

/** Which kind of resource each booking type uses. */
const RESOURCE_TYPE_FOR: Record<BookingType, BookingResourceType> = {
  [BookingType.MEETING]: BookingResourceType.MEETING_ROOM,
  [BookingType.MEETING_ROOM]: BookingResourceType.MEETING_ROOM,
  [BookingType.POOL_TABLE]: BookingResourceType.POOL_TABLE,
};

const TYPE_LABEL: Record<BookingType, string> = {
  [BookingType.MEETING]: 'Meeting',
  [BookingType.MEETING_ROOM]: 'Meeting room',
  [BookingType.POOL_TABLE]: 'Pool table',
};

// pg_advisory_xact_lock(class, id) keys — serialise bookings per room/table and per person, so two
// people saving the same slot at the same moment can't both get it.
const LOCK_RESOURCE = 7101;
const LOCK_USER = 7102;

const RELATIONS = [
  'resource',
  'organizer',
  'createdBy',
  'cancelledBy',
  'participants',
  'participants.user',
];

const fullName = (user: User | null | undefined) =>
  user ? `${user.firstName} ${user.lastName}` : '';

/** A validated, ready-to-save booking. */
type BookingPlan = {
  type: BookingType;
  title: string;
  purpose: string | null;
  description: string | null;
  resource: BookingResource | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  organizerId: number;
  participantIds: number[];
};

type MeetingNotice = 'invited' | 'rescheduled' | 'cancelled' | 'removed';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(BookingResource)
    private readonly resourcesRepo: Repository<BookingResource>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notifier: NotifyService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------------------------

  private async load(id: number): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({ where: { id }, relations: RELATIONS });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private async loadMany(ids: number[]): Promise<Booking[]> {
    if (!ids.length) return [];
    const rows = await this.bookingsRepo.find({ where: { id: In(ids) }, relations: RELATIONS });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id)).filter((row): row is Booking => !!row);
  }

  /**
   * GET /bookings. Room and pool-table bookings are visible to everyone; meetings only to their
   * organiser and participants — except that a meeting held in a room shows up for others as a
   * "Private meeting" block, so the room's busy time is visible without any details.
   */
  async list(
    query: QueryBookingsDto,
    caller: JwtUserPayload,
  ): Promise<{ data: BookingDto[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const params: unknown[] = [caller.sub];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    const involved = `(b.organizer_id = $1 OR b.created_by_id = $1 OR EXISTS (
      SELECT 1 FROM booking_participants vp WHERE vp.booking_id = b.id AND vp.user_id = $1))`;
    const visible = `(b.type <> 'MEETING' OR ${involved})`;
    const where: string[] = [];
    if (query.scope === 'mine') where.push(involved);
    // Private room blocks only on the calendar (a date range), and never when filtering by person
    // or searching titles — that would reveal private meetings.
    else if (query.from && query.to && !query.userId && !query.search) {
      where.push(`(${visible} OR (b.type = 'MEETING' AND b.resource_id IS NOT NULL))`);
    } else where.push(visible);

    if (query.from) where.push(`b.end_at > ${param(pktDayRange(query.from).start)}`);
    if (query.to) where.push(`b.start_at < ${param(pktDayRange(query.to).end)}`);
    if (query.type) where.push(`b.type = ${param(query.type)}`);
    if (query.status) where.push(`b.status = ${param(query.status)}`);
    if (query.resourceId) where.push(`b.resource_id = ${param(query.resourceId)}`);
    if (query.userId) {
      const user = param(query.userId);
      where.push(`(b.organizer_id = ${user} OR EXISTS (
        SELECT 1 FROM booking_participants up WHERE up.booking_id = b.id AND up.user_id = ${user}))`);
    }
    if (query.when === 'upcoming') where.push(`b.end_at >= now()`);
    if (query.when === 'past') where.push(`b.end_at < now()`);
    if (query.search) {
      const term = param(`%${query.search.replace(/[\\%_]/g, '\\$&')}%`);
      where.push(`(b.title ILIKE ${term} OR EXISTS (
        SELECT 1 FROM users su WHERE su.id = b.organizer_id
          AND (su.first_name || ' ' || su.last_name) ILIKE ${term}))`);
    }

    const whereSql = where.join(' AND ');
    const [{ total }] = (await this.dataSource.query(
      `SELECT count(*)::int AS total FROM bookings b WHERE ${whereSql}`,
      params,
    )) as Array<{ total: number }>;
    const order = query.when === 'past' ? 'b.start_at DESC' : 'b.start_at ASC';
    const rows = (await this.dataSource.query(
      `SELECT b.id FROM bookings b WHERE ${whereSql} ORDER BY ${order}, b.id
       LIMIT ${param(limit)} OFFSET ${param((page - 1) * limit)}`,
      params,
    )) as Array<{ id: number }>;

    const bookings = await this.loadMany(rows.map((row) => row.id));
    return { data: bookings.map((b) => toBookingDto(b, caller)), meta: { total, page, limit } };
  }

  /** GET /bookings/:id — meetings only for their organiser / participants. */
  async getOne(id: number, caller: JwtUserPayload): Promise<BookingDto> {
    const booking = await this.load(id);
    if (booking.type === BookingType.MEETING && !isBookingInvolved(booking, caller)) {
      throw new ForbiddenException('You are not invited to this meeting');
    }
    return toBookingDto(booking, caller);
  }

  /**
   * GET /bookings/upcoming-meetings — the dashboard card: meetings the caller organises or is
   * invited to that haven't ended yet. Cancelled ones stay listed (marked Cancelled) until their
   * start time, so people notice the cancellation.
   */
  async upcomingMeetings(
    limit: number,
    caller: JwtUserPayload,
  ): Promise<{ data: BookingDto[]; total: number }> {
    const mine = `b.type = 'MEETING' AND b.end_at >= now() AND (b.organizer_id = $1 OR EXISTS (
      SELECT 1 FROM booking_participants bp WHERE bp.booking_id = b.id AND bp.user_id = $1))`;
    const rows = (await this.dataSource.query(
      `SELECT b.id FROM bookings b
       WHERE ${mine} AND (b.status = 'CONFIRMED' OR b.start_at >= now())
       ORDER BY b.start_at, b.id LIMIT $2`,
      [caller.sub, limit],
    )) as Array<{ id: number }>;
    const [{ total }] = (await this.dataSource.query(
      `SELECT count(*)::int AS total FROM bookings b WHERE ${mine} AND b.status = 'CONFIRMED'`,
      [caller.sub],
    )) as Array<{ total: number }>;
    const bookings = await this.loadMany(rows.map((row) => row.id));
    return { data: bookings.map((b) => toBookingDto(b, caller)), total };
  }

  /**
   * GET /bookings/availability — for the booking form: when the chosen room / table is taken that
   * day, and when each chosen person is already in a meeting. Times only, no meeting details.
   */
  async availability(query: AvailabilityQueryDto) {
    const { start, end } = pktDayRange(query.date);
    const exclude = query.excludeBookingId ?? null;

    let resourceBusy: Array<{ startAt: string; endAt: string; type: BookingType }> = [];
    if (query.resourceId) {
      const rows = (await this.dataSource.query(
        `SELECT start_at, end_at, type FROM bookings
         WHERE resource_id = $1 AND status = 'CONFIRMED' AND start_at < $3 AND end_at > $2
           AND ($4::int IS NULL OR id <> $4)
         ORDER BY start_at`,
        [query.resourceId, start, end, exclude],
      )) as Array<{ start_at: Date; end_at: Date; type: BookingType }>;
      resourceBusy = rows.map((row) => ({
        startAt: row.start_at.toISOString(),
        endAt: row.end_at.toISOString(),
        type: row.type,
      }));
    }

    const userIds = [...new Set(query.userIds ?? [])];
    let people: Array<{
      userId: number;
      name: string;
      busy: { startAt: string; endAt: string }[];
    }> = [];
    if (userIds.length) {
      const users = await this.usersRepo.find({ where: { id: In(userIds) } });
      const rows = (await this.dataSource.query(
        `SELECT x.user_id, b.start_at, b.end_at FROM bookings b
         JOIN LATERAL (
           SELECT b.organizer_id AS user_id
           UNION SELECT bp.user_id FROM booking_participants bp WHERE bp.booking_id = b.id
         ) x ON true
         WHERE b.type = 'MEETING' AND b.status = 'CONFIRMED'
           AND b.start_at < $2 AND b.end_at > $1
           AND ($3::int IS NULL OR b.id <> $3) AND x.user_id = ANY($4::int[])
         ORDER BY b.start_at`,
        [start, end, exclude, userIds],
      )) as Array<{ user_id: number; start_at: Date; end_at: Date }>;
      people = users.map((user) => ({
        userId: user.id,
        name: fullName(user),
        busy: rows
          .filter((row) => row.user_id === user.id)
          .map((row) => ({ startAt: row.start_at.toISOString(), endAt: row.end_at.toISOString() })),
      }));
    }

    return { date: query.date, resource: resourceBusy, people };
  }

  // ---------------------------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------------------------

  /** Validates the form and turns it into a booking plan (no clash checks yet — see `lockAndCheck`). */
  private async plan(
    type: BookingType,
    dto: UpdateBookingDto,
    organizerId: number,
    existing: Booking | null,
  ): Promise<BookingPlan> {
    const startAt = pktToDate(dto.date, dto.time);
    if (Number.isNaN(startAt.getTime())) throw new BadRequestException('That date is not valid');
    const endAt = addMinutes(startAt, dto.durationMinutes);
    // A booking that's already under way can be edited (e.g. extended) as long as its start
    // doesn't move; anything new or moved must start in the future.
    const startMoved = !existing || existing.startAt.getTime() !== startAt.getTime();
    if (startMoved && startAt.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('Pick a start time in the future');
    }

    let resource: BookingResource | null = null;
    if (dto.resourceId) {
      resource = await this.resourcesRepo.findOne({ where: { id: dto.resourceId } });
      if (!resource || resource.type !== RESOURCE_TYPE_FOR[type]) {
        throw new BadRequestException(
          type === BookingType.POOL_TABLE ? 'Pick a pool table' : 'Pick a meeting room',
        );
      }
      if (!resource.isActive && resource.id !== existing?.resourceId) {
        throw new BadRequestException(`${resource.name} is not available for booking`);
      }
    } else if (type !== BookingType.MEETING) {
      throw new BadRequestException(
        type === BookingType.POOL_TABLE ? 'Pick a pool table' : 'Pick a meeting room',
      );
    }

    const title = dto.title?.trim() ?? '';
    let participantIds: number[] = [];
    if (type === BookingType.MEETING) {
      if (!title) throw new BadRequestException('Give the meeting a title');
      participantIds = [...new Set(dto.participantIds ?? [])].filter((id) => id !== organizerId);
      if (!participantIds.length) {
        throw new BadRequestException('Invite at least one employee to the meeting');
      }
      const people = await this.usersRepo.find({
        where: { id: In(participantIds), status: UserStatus.ACTIVE },
      });
      if (people.length !== participantIds.length) {
        throw new BadRequestException('Some of the selected employees are no longer active');
      }
    } else if (dto.participantIds?.length) {
      throw new BadRequestException('Only meetings have invited participants');
    }

    return {
      type,
      title: title || `${resource!.name} booking`,
      purpose: dto.purpose?.trim() || null,
      description: dto.description?.trim() || null,
      resource,
      location: type === BookingType.MEETING ? dto.location?.trim() || null : null,
      startAt,
      endAt,
      organizerId,
      participantIds,
    };
  }

  /**
   * Inside the saving transaction: locks the room / table and every person involved (always in the
   * same order, so concurrent bookings queue instead of deadlocking), then rejects the booking if
   * the room / table is taken or anyone is already in another meeting at that time.
   */
  private async lockAndCheck(
    manager: EntityManager,
    plan: BookingPlan,
    excludeId: number | null,
  ): Promise<void> {
    if (plan.resource) {
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
        LOCK_RESOURCE,
        plan.resource.id,
      ]);
      const clash = (await manager.query(
        `SELECT start_at, end_at FROM bookings
         WHERE resource_id = $1 AND status = 'CONFIRMED' AND start_at < $3 AND end_at > $2
           AND ($4::int IS NULL OR id <> $4)
         ORDER BY start_at LIMIT 1`,
        [plan.resource.id, plan.startAt, plan.endAt, excludeId],
      )) as Array<{ start_at: Date; end_at: Date }>;
      if (clash.length) {
        throw new ConflictException(
          `${plan.resource.name} is already booked ${formatBookingWhen(clash[0].start_at, clash[0].end_at)}. ` +
            (plan.resource.type === BookingResourceType.MEETING_ROOM
              ? 'Pick another time or another room.'
              : 'Pick another time.'),
        );
      }
    }

    if (plan.type === BookingType.MEETING) {
      const people = [plan.organizerId, ...plan.participantIds].sort((a, b) => a - b);
      for (const id of people) {
        await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [LOCK_USER, id]);
      }
      const busy = (await manager.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name FROM bookings b
         JOIN LATERAL (
           SELECT b.organizer_id AS user_id
           UNION SELECT bp.user_id FROM booking_participants bp WHERE bp.booking_id = b.id
         ) x ON true
         JOIN users u ON u.id = x.user_id
         WHERE b.type = 'MEETING' AND b.status = 'CONFIRMED'
           AND b.start_at < $2 AND b.end_at > $1
           AND ($3::int IS NULL OR b.id <> $3) AND x.user_id = ANY($4::int[])`,
        [plan.startAt, plan.endAt, excludeId, people],
      )) as Array<{ id: number; first_name: string; last_name: string }>;
      if (busy.length) {
        const names = busy.map((u) => `${u.first_name} ${u.last_name}`).join(', ');
        throw new ConflictException(
          `Already in another meeting at this time: ${names}. Pick another time or remove them.`,
        );
      }
    }
  }

  async create(dto: CreateBookingDto, caller: JwtUserPayload): Promise<BookingDto> {
    if (dto.type === BookingType.MEETING && !MEETING_ORGANIZER_ROLES.includes(caller.role)) {
      throw new ForbiddenException('Only the CEO, HR / Admin and Team Leads can organise meetings');
    }
    const plan = await this.plan(dto.type, dto, caller.sub, null);

    const id = await this.dataSource.transaction(async (manager) => {
      await this.lockAndCheck(manager, plan, null);
      const repo = manager.getRepository(Booking);
      const saved = await repo.save(
        repo.create({
          type: plan.type,
          title: plan.title,
          purpose: plan.purpose,
          description: plan.description,
          resourceId: plan.resource?.id ?? null,
          location: plan.location,
          startAt: plan.startAt,
          endAt: plan.endAt,
          status: BookingStatus.CONFIRMED,
          organizerId: plan.organizerId,
          createdById: caller.sub,
        }),
      );
      if (plan.participantIds.length) {
        const participants = manager.getRepository(BookingParticipant);
        await participants.save(
          plan.participantIds.map((userId) => participants.create({ bookingId: saved.id, userId })),
        );
      }
      return saved.id;
    });

    const booking = await this.load(id);
    if (booking.type === BookingType.MEETING) {
      await this.notifyMeeting(
        booking,
        booking.participants.map((p) => p.userId),
        'invited',
      );
    }
    return toBookingDto(booking, caller);
  }

  private assertCanManage(booking: Booking, caller: JwtUserPayload): void {
    const own = booking.organizerId === caller.sub || booking.createdById === caller.sub;
    const admin = booking.type !== BookingType.MEETING && BOOKING_ADMIN_ROLES.includes(caller.role);
    if (!own && !admin) {
      throw new ForbiddenException(
        booking.type === BookingType.MEETING
          ? 'Only the organiser can change this meeting'
          : 'Only the person who booked it, or HR / Admin, can change this booking',
      );
    }
  }

  private assertChangeable(booking: Booking): void {
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException('This booking was cancelled — make a new one instead');
    }
    if (booking.endAt.getTime() < Date.now()) {
      throw new ConflictException('This booking has already ended');
    }
  }

  /** PATCH /bookings/:id — edit and/or reschedule. */
  async update(id: number, dto: UpdateBookingDto, caller: JwtUserPayload): Promise<BookingDto> {
    const before = await this.load(id);
    this.assertCanManage(before, caller);
    this.assertChangeable(before);
    const plan = await this.plan(before.type, dto, before.organizerId, before);

    const oldIds = before.participants.map((p) => p.userId);
    const added = plan.participantIds.filter((uid) => !oldIds.includes(uid));
    const removed = oldIds.filter((uid) => !plan.participantIds.includes(uid));
    const kept = oldIds.filter((uid) => plan.participantIds.includes(uid));
    const timeOrPlaceChanged =
      before.startAt.getTime() !== plan.startAt.getTime() ||
      before.endAt.getTime() !== plan.endAt.getTime() ||
      before.resourceId !== (plan.resource?.id ?? null) ||
      (before.location ?? null) !== plan.location;

    await this.dataSource.transaction(async (manager) => {
      await this.lockAndCheck(manager, plan, id);
      const result = await manager.getRepository(Booking).update(
        { id, status: BookingStatus.CONFIRMED },
        {
          title: plan.title,
          purpose: plan.purpose,
          description: plan.description,
          resourceId: plan.resource?.id ?? null,
          location: plan.location,
          startAt: plan.startAt,
          endAt: plan.endAt,
          sequence: timeOrPlaceChanged ? before.sequence + 1 : before.sequence,
        },
      );
      if (!result.affected) {
        throw new ConflictException('This booking was cancelled in the meantime');
      }
      const participants = manager.getRepository(BookingParticipant);
      if (removed.length) await participants.delete({ bookingId: id, userId: In(removed) });
      if (added.length) {
        await participants.save(
          added.map((userId) => participants.create({ bookingId: id, userId })),
        );
      }
    });

    const after = await this.load(id);
    if (after.type === BookingType.MEETING) {
      if (added.length) await this.notifyMeeting(after, added, 'invited');
      if (removed.length) await this.notifyMeeting(after, removed, 'removed');
      if (timeOrPlaceChanged) {
        const told = after.organizerId === caller.sub ? kept : [...kept, after.organizerId];
        await this.notifyMeeting(after, told, 'rescheduled', before);
      }
    } else if (after.organizerId !== caller.sub) {
      await this.notifyBookingOwner(after, 'changed', caller);
    }
    return toBookingDto(after, caller);
  }

  /** POST /bookings/:id/cancel */
  async cancel(
    id: number,
    reason: string | undefined,
    caller: JwtUserPayload,
  ): Promise<BookingDto> {
    const booking = await this.load(id);
    this.assertCanManage(booking, caller);
    this.assertChangeable(booking);

    // Conditional update: two clicks / two people cancelling at once only cancel (and notify) once.
    const result = await this.bookingsRepo
      .createQueryBuilder()
      .update(Booking)
      .set({
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: caller.sub,
        cancelReason: reason?.trim() || null,
        sequence: () => 'sequence + 1',
      })
      .where('id = :id AND status = :status', { id, status: BookingStatus.CONFIRMED })
      .execute();
    if (!result.affected) throw new ConflictException('This booking is already cancelled');

    const after = await this.load(id);
    if (after.type === BookingType.MEETING) {
      const told = after.participants.map((p) => p.userId);
      if (after.organizerId !== caller.sub) told.push(after.organizerId);
      await this.notifyMeeting(after, told, 'cancelled');
    } else if (after.organizerId !== caller.sub) {
      await this.notifyBookingOwner(after, 'cancelled', caller);
    }
    return toBookingDto(after, caller);
  }

  // ---------------------------------------------------------------------------------------------
  // Notifications (bell + email; meetings carry a calendar invite)
  // ---------------------------------------------------------------------------------------------

  private placeOf(booking: Booking): string {
    return booking.resource?.name ?? booking.location ?? 'Not specified';
  }

  private async notifyMeeting(
    booking: Booking,
    userIds: number[],
    notice: MeetingNotice,
    before?: Booking,
  ): Promise<void> {
    if (!userIds.length) return;
    const when = formatBookingWhen(booking.startAt, booking.endAt);
    const organizer = fullName(booking.organizer);
    const minutes = Math.round((booking.endAt.getTime() - booking.startAt.getTime()) / 60_000);

    const copy: Record<MeetingNotice, { title: string; body: string }> = {
      invited: {
        title: `Meeting invite: ${booking.title}`,
        body: `${organizer} invited you to a meeting on ${when}.`,
      },
      rescheduled: {
        title: `Meeting updated: ${booking.title}`,
        body: before
          ? `Now ${when} (was ${formatBookingWhen(before.startAt, before.endAt)}).`
          : `Now ${when}.`,
      },
      cancelled: {
        title: `Meeting cancelled: ${booking.title}`,
        body: `The meeting on ${when} has been cancelled.${booking.cancelReason ? ` Reason: ${booking.cancelReason}` : ''}`,
      },
      removed: {
        title: `Removed from meeting: ${booking.title}`,
        body: `You are no longer invited to the meeting on ${when}.`,
      },
    };

    const attendees = booking.participants
      .filter((p) => p.user)
      .map((p) => ({ name: fullName(p.user), email: p.user.email }));
    const ics = buildIcs({
      uid: `booking-${booking.id}@bnw-oms`,
      sequence: booking.sequence,
      method: notice === 'invited' || notice === 'rescheduled' ? 'REQUEST' : 'CANCEL',
      start: booking.startAt,
      end: booking.endAt,
      summary: booking.title,
      description: [booking.purpose, booking.description].filter(Boolean).join('\n\n'),
      location: this.placeOf(booking),
      url: this.mail.appUrl(`/dashboard/bookings/${booking.id}`),
      organizer: { name: organizer, email: booking.organizer?.email ?? this.mail.fromAddress() },
      attendees,
    });

    await this.notifier.send(userIds, {
      type: 'MEETING',
      title: copy[notice].title,
      body: copy[notice].body,
      link: `/dashboard/bookings/${booking.id}`,
      rows: [
        { label: 'When', value: when },
        { label: 'Duration', value: formatDuration(minutes) },
        { label: 'Room / location', value: this.placeOf(booking) },
        { label: 'Organiser', value: organizer },
        ...(booking.purpose ? [{ label: 'Purpose', value: booking.purpose }] : []),
      ],
      icalEvent: {
        method: notice === 'invited' || notice === 'rescheduled' ? 'REQUEST' : 'CANCEL',
        content: ics,
      },
    });
  }

  /** HR / Admin changed or cancelled someone's room / pool-table booking — tell the owner. */
  private async notifyBookingOwner(
    booking: Booking,
    what: 'changed' | 'cancelled',
    caller: JwtUserPayload,
  ): Promise<void> {
    const actor = await this.usersRepo.findOne({ where: { id: caller.sub } });
    await this.notifier.send([booking.organizerId], {
      type: 'BOOKING',
      title: `Your ${TYPE_LABEL[booking.type].toLowerCase()} booking was ${what}`,
      body: `${fullName(actor) || 'HR'} ${what} your booking of ${this.placeOf(booking)}.${
        what === 'cancelled' && booking.cancelReason ? ` Reason: ${booking.cancelReason}` : ''
      }`,
      link: `/dashboard/bookings/${booking.id}`,
      rows: [
        { label: 'When', value: formatBookingWhen(booking.startAt, booking.endAt) },
        { label: 'What', value: this.placeOf(booking) },
      ],
    });
  }

  /**
   * GET /bookings/people — active employees for the meeting organiser's participant picker (the
   * CEO and Team Leads can't use GET /users). Names, job title and department only.
   */
  async people(): Promise<
    Array<{ id: number; name: string; designation: string | null; department: string | null }>
  > {
    const users = await this.usersRepo.find({
      where: { status: UserStatus.ACTIVE },
      relations: ['department'],
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
    return users.map((user) => ({
      id: user.id,
      name: fullName(user),
      designation: user.designation,
      department: user.department?.name ?? null,
    }));
  }

  // ---------------------------------------------------------------------------------------------
  // Rooms & tables
  // ---------------------------------------------------------------------------------------------

  async listResources(
    query: QueryBookingResourcesDto,
    caller: JwtUserPayload,
  ): Promise<BookingResourceDto[]> {
    const includeInactive = query.includeInactive && BOOKING_ADMIN_ROLES.includes(caller.role);
    const rows = await this.resourcesRepo.find({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      order: { type: 'ASC', name: 'ASC' },
    });
    return rows.map(toBookingResourceDto);
  }

  private async assertNameFree(type: BookingResourceType, name: string, exceptId?: number) {
    const clash = await this.resourcesRepo
      .createQueryBuilder('r')
      .where('r.type = :type AND lower(r.name) = lower(:name)', { type, name })
      .andWhere(exceptId ? 'r.id <> :exceptId' : '1=1', { exceptId })
      .getOne();
    if (clash) throw new ConflictException(`There is already one called "${clash.name}"`);
  }

  async createResource(dto: CreateBookingResourceDto): Promise<BookingResourceDto> {
    await this.assertNameFree(dto.type, dto.name);
    const saved = await this.resourcesRepo.save(
      this.resourcesRepo.create({
        type: dto.type,
        name: dto.name,
        location: dto.location || null,
        capacity: dto.capacity ?? null,
        isActive: true,
      }),
    );
    return toBookingResourceDto(saved);
  }

  async updateResource(id: number, dto: UpdateBookingResourceDto): Promise<BookingResourceDto> {
    const resource = await this.resourcesRepo.findOne({ where: { id } });
    if (!resource) throw new NotFoundException('Room / table not found');
    if (dto.name !== undefined && dto.name !== resource.name) {
      await this.assertNameFree(resource.type, dto.name, id);
      resource.name = dto.name;
    }
    if (dto.location !== undefined) resource.location = dto.location || null;
    if (dto.capacity !== undefined) resource.capacity = dto.capacity ?? null;
    if (dto.isActive !== undefined) resource.isActive = dto.isActive;
    return toBookingResourceDto(await this.resourcesRepo.save(resource));
  }
}
