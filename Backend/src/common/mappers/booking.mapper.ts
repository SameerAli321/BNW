import { Booking } from '../../entities/booking.entity';
import { BookingResource } from '../../entities/booking-resource.entity';
import { User } from '../../entities/user.entity';
import { BookingResourceType, BookingStatus, BookingType } from '../enums/booking.enum';
import { RoleName } from '../enums/role.enum';
import { dateToPkt } from '../../bookings/booking-time';

export interface BookingPersonDto {
  id: number;
  name: string;
  designation: string | null;
}

export interface BookingResourceDto {
  id: number;
  type: BookingResourceType;
  name: string;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
}

export interface BookingDto {
  id: number;
  type: BookingType;
  status: BookingStatus;
  /** A meeting the viewer isn't part of, shown only so a room's busy time is visible. */
  isPrivate: boolean;
  title: string;
  purpose: string | null;
  description: string | null;
  startAt: string;
  endAt: string;
  /** Pakistan-time parts, for edit forms. */
  date: string;
  time: string;
  durationMinutes: number;
  resource: BookingResourceDto | null;
  location: string | null;
  organizer: BookingPersonDto | null;
  createdBy: BookingPersonDto | null;
  participants: BookingPersonDto[];
  /** The viewer is the organiser or one of the participants. */
  isInvolved: boolean;
  /** The viewer may edit / reschedule / cancel it. */
  canManage: boolean;
  isPast: boolean;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledBy: BookingPersonDto | null;
  createdAt: string;
  updatedAt: string;
}

export type BookingViewer = {
  sub: number;
  role: string;
  /**
   * Whose meetings the viewer may see in full — 'all' (HR / Admin / CEO) or their calendar scope
   * (a Team Lead's own id + their team). Left out = only meetings they're part of.
   */
  visibleUserIds?: Set<number> | 'all';
};

/** Roles that may change or cancel anyone's room / pool-table booking. */
export const BOOKING_ADMIN_ROLES: string[] = [RoleName.HR, RoleName.ADMIN];

export function toBookingResourceDto(resource: BookingResource): BookingResourceDto {
  return {
    id: resource.id,
    type: resource.type,
    name: resource.name,
    location: resource.location,
    capacity: resource.capacity,
    isActive: resource.isActive,
  };
}

const person = (user: User | null | undefined): BookingPersonDto | null =>
  user
    ? { id: user.id, name: `${user.firstName} ${user.lastName}`, designation: user.designation }
    : null;

/** Organiser, whoever made it, or an invited participant. */
export function isBookingInvolved(booking: Booking, viewer: BookingViewer): boolean {
  return (
    booking.organizerId === viewer.sub ||
    booking.createdById === viewer.sub ||
    (booking.participants ?? []).some((p) => p.userId === viewer.sub)
  );
}

/** Not a meeting, the viewer is part of it, or it involves someone in the viewer's calendar scope. */
export function canSeeBookingDetails(booking: Booking, viewer: BookingViewer): boolean {
  if (booking.type !== BookingType.MEETING || isBookingInvolved(booking, viewer)) return true;
  const scope = viewer.visibleUserIds;
  if (!scope) return false;
  if (scope === 'all') return true;
  return (
    scope.has(booking.organizerId) ||
    (booking.createdById !== null && scope.has(booking.createdById)) ||
    (booking.participants ?? []).some((p) => scope.has(p.userId))
  );
}

/**
 * Needs `resource`, `organizer`, `createdBy`, `cancelledBy` and `participants.user` loaded. A
 * meeting the viewer isn't part of (and can't see through their calendar scope — see
 * `BookingViewer.visibleUserIds`) comes back with its details blanked out (`isPrivate`).
 */
export function toBookingDto(booking: Booking, viewer: BookingViewer): BookingDto {
  const involved = isBookingInvolved(booking, viewer);
  const isPrivate = !canSeeBookingDetails(booking, viewer);
  const isPast = booking.endAt.getTime() < Date.now();
  const canManage =
    !isPrivate &&
    (booking.organizerId === viewer.sub ||
      booking.createdById === viewer.sub ||
      (booking.type !== BookingType.MEETING && BOOKING_ADMIN_ROLES.includes(viewer.role)));
  const pkt = dateToPkt(booking.startAt);

  return {
    id: booking.id,
    type: booking.type,
    status: booking.status,
    isPrivate,
    title: isPrivate ? 'Private meeting' : booking.title,
    purpose: isPrivate ? null : booking.purpose,
    description: isPrivate ? null : booking.description,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    date: pkt.date,
    time: pkt.time,
    durationMinutes: Math.round((booking.endAt.getTime() - booking.startAt.getTime()) / 60_000),
    resource: booking.resource ? toBookingResourceDto(booking.resource) : null,
    location: isPrivate ? null : booking.location,
    organizer: isPrivate ? null : person(booking.organizer),
    createdBy: isPrivate ? null : person(booking.createdBy),
    participants: isPrivate
      ? []
      : (booking.participants ?? [])
          .map((p) => person(p.user))
          .filter((p): p is BookingPersonDto => !!p)
          .sort((a, b) => a.name.localeCompare(b.name)),
    isInvolved: involved,
    canManage,
    isPast,
    cancelReason: isPrivate ? null : booking.cancelReason,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    cancelledBy: isPrivate ? null : person(booking.cancelledBy),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}
