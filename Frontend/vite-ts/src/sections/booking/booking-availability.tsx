import type { BookingResource } from 'src/actions/bookings';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { useGetBookingAvailability } from 'src/actions/bookings';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import {
  fClock,
  fPktTime,
  pktToday,
  pktToDate,
  fPktRange,
  overlapsAny,
} from './booking-utils';

// ----------------------------------------------------------------------

/** Slot grid: 30-minute starts from 8:00 AM to 7:30 PM. */
const GRID_TIMES = Array.from({ length: 24 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

type Props = {
  date: string;
  time: string;
  durationMinutes: number;
  resource: BookingResource | null;
  participants: { id: number; name: string }[];
  /** Meetings: the organiser's own calendar is checked too. */
  organizerId?: number;
  excludeBookingId?: number;
  onPickTime: (time: string) => void;
};

/**
 * Live availability for the booking form: the chosen room / table's free and booked slots that
 * day (click a free one to pick it), and whether each participant is free at the chosen time.
 * Only busy times are shown — never what other meetings are about.
 */
export function BookingAvailabilityPanel({
  date,
  time,
  durationMinutes,
  resource,
  participants,
  organizerId,
  excludeBookingId,
  onPickTime,
}: Props) {
  const userIds = [...new Set([...(organizerId ? [organizerId] : []), ...participants.map((p) => p.id)])];
  const { availability, availabilityLoading } = useGetBookingAvailability({
    date,
    resourceId: resource?.id,
    userIds,
    excludeBookingId,
  });

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const start = validDate ? pktToDate(date, time) : null;
  const end = start ? new Date(start.getTime() + durationMinutes * 60_000) : null;
  const resourceBusy = availability?.date === date ? availability.resource : [];
  const peopleBusy = availability?.date === date ? availability.people : [];

  const resourceClash = !!(start && end && resource && overlapsAny(start, end, resourceBusy));
  const busyPeople = start && end
    ? peopleBusy.filter((p) => overlapsAny(start, end, p.busy))
    : [];
  const isToday = date === pktToday();

  const renderSummary = () => {
    if (!start || !end) return null;
    const clash = resourceClash || busyPeople.length > 0;
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">Your slot</Typography>
        <Typography variant="body2">{fPktRange(start.toISOString(), end.toISOString())}</Typography>
        <Box>
          {clash ? (
            <Label color="error" startIcon={<Iconify icon="solar:danger-triangle-bold" />}>
              {resourceClash ? `${resource?.name} is booked` : 'Someone is busy'}
            </Label>
          ) : (
            <Label color="success" startIcon={<Iconify icon="solar:check-circle-bold" />}>
              Available
            </Label>
          )}
        </Box>
      </Stack>
    );
  };

  const renderSlots = () => {
    if (!resource) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Pick a room or table to see its free slots.
        </Typography>
      );
    }
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">{resource.name} — that day</Typography>
        <Box
          role="list"
          aria-label={`${resource.name} slots`}
          sx={{ display: 'grid', gap: 0.75, gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          {GRID_TIMES.map((t) => {
            const slotStart = pktToDate(date, t);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
            const booked = overlapsAny(slotStart, slotEnd, resourceBusy);
            const past = isToday && slotStart.getTime() < Date.now();
            const selected =
              !!start && !!end && slotStart < end && slotEnd > start;
            const disabled = booked || past;
            return (
              <ButtonBase
                key={t}
                role="listitem"
                disabled={disabled}
                onClick={() => onPickTime(t)}
                aria-label={`${fClock(t)} ${booked ? 'booked' : past ? 'past' : 'available'}`}
                sx={(theme) => ({
                  py: 0.75,
                  borderRadius: 1,
                  typography: 'caption',
                  fontWeight: 600,
                  border: `1px solid ${theme.vars.palette.divider}`,
                  ...(booked && {
                    color: 'error.dark',
                    bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.12),
                    borderColor: 'transparent',
                    textDecoration: 'line-through',
                  }),
                  ...(!booked &&
                    !past && {
                      color: 'success.dark',
                      bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.08),
                      '&:hover': {
                        bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
                      },
                    }),
                  ...(past && { color: 'text.disabled' }),
                  ...(selected && {
                    outline: `2px solid ${theme.vars.palette.primary.main}`,
                    outlineOffset: -2,
                  }),
                  '&:focus-visible': {
                    outline: `2px solid ${theme.vars.palette.primary.main}`,
                    outlineOffset: 1,
                  },
                })}
              >
                {fClock(t).replace(':00', '')}
              </ButtonBase>
            );
          })}
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Label color="success" variant="soft">Available</Label>
          <Label color="error" variant="soft">Booked</Label>
          <Label color="primary" variant="outlined">Your selection</Label>
        </Stack>
        {!!resourceBusy.length && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Booked:{' '}
            {resourceBusy.map((b) => `${fPktTime(b.startAt)}–${fPktTime(b.endAt)}`).join(', ')}
          </Typography>
        )}
      </Stack>
    );
  };

  const renderPeople = () => {
    if (!participants.length) return null;
    // Participants in the order they were picked, then the organiser.
    const ids = [
      ...participants.map((p) => p.id),
      ...(organizerId && !participants.some((p) => p.id === organizerId) ? [organizerId] : []),
    ];
    const rows = ids
      .map((id) => peopleBusy.find((p) => p.userId === id))
      .filter((p): p is (typeof peopleBusy)[number] => !!p);
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Participants at this time</Typography>
        {rows.map((p) => {
            const busy = busyPeople.some((b) => b.userId === p.userId);
            return (
              <Stack key={p.userId} direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {p.name}
                    {p.userId === organizerId ? ' (you, organiser)' : ''}
                  </Typography>
                  {!!p.busy.length && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      In meetings: {p.busy.map((b) => `${fPktTime(b.startAt)}–${fPktTime(b.endAt)}`).join(', ')}
                    </Typography>
                  )}
                </Box>
                <Label color={busy ? 'error' : 'success'}>{busy ? 'Busy' : 'Free'}</Label>
              </Stack>
            );
          })}
      </Stack>
    );
  };

  return (
    <Card sx={{ p: { xs: 2, md: 3 }, position: 'relative' }}>
      {availabilityLoading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      )}
      <Stack spacing={2.5} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
        {renderSummary()}
        {renderSlots()}
        {renderPeople()}
      </Stack>
    </Card>
  );
}
