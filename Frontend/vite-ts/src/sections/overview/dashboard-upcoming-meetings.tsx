import type { BookingDto } from 'src/actions/bookings';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetBookings } from 'src/actions/bookings';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { BookingNewMenu } from 'src/sections/booking/booking-new-menu';
import {
  fPktTime,
  fPktDate,
  fDuration,
  PKT_LABEL,
  bookingPlace,
  BOOKING_TYPE_META,
  bookingStatusLabel,
} from 'src/sections/booking/booking-utils';

import { CardLink, DashboardList, DashboardListRow } from './dashboard-widgets';

// ----------------------------------------------------------------------

/** "Starts in 25 min" / "Starts in 3 h" / "Starts in 2 days" / "In progress". */
function startsIn(booking: BookingDto): string {
  const minutes = Math.round((new Date(booking.startAt).getTime() - Date.now()) / 60_000);
  if (minutes <= 0) return 'In progress';
  if (minutes < 60) return `Starts in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Starts in ${hours} h`;
  const days = Math.round(hours / 24);
  return `Starts in ${days} day${days === 1 ? '' : 's'}`;
}

function details(booking: BookingDto): string {
  const place = bookingPlace(booking);
  return [
    `${fPktDate(booking.startAt)}, ${fPktTime(booking.startAt)}`,
    fDuration(booking.durationMinutes),
    place || null,
    booking.type === 'MEETING' && booking.organizer ? `Organiser: ${booking.organizer.name}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * "My upcoming meetings & bookings" — highlighted on every dashboard. Built from the user's own
 * records: meetings they organise or are invited to, and rooms / pool-table slots they booked. The
 * soonest one is featured with a countdown; a rescheduled one shows its new time and a cancelled
 * one stays (marked Cancelled) until it would have ended. Refreshes every minute.
 */
export function DashboardUpcomingMeetings() {
  const { bookings, bookingsTotal, bookingsLoading } = useGetBookings({
    scope: 'mine',
    when: 'upcoming',
    limit: 5,
  });

  const next = bookings.find((b) => b.status === 'CONFIRMED') ?? bookings[0];
  const rest = bookings.filter((b) => b !== next).slice(0, 3);

  const renderNext = (booking: BookingDto) => {
    const meta = BOOKING_TYPE_META[booking.type];
    const status = bookingStatusLabel(booking);
    const cancelled = booking.status === 'CANCELLED';
    return (
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={(theme) => ({
          p: 2,
          mx: 2,
          mb: rest.length ? 1 : 2,
          borderRadius: 1.5,
          bgcolor: varAlpha(theme.vars.palette[meta.color].mainChannel, cancelled ? 0.04 : 0.1),
          border: `1px solid ${varAlpha(theme.vars.palette[meta.color].mainChannel, 0.24)}`,
          opacity: cancelled ? 0.7 : 1,
        })}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            flexShrink: 0,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color: `${meta.color}.contrastText`,
            bgcolor: `${meta.color}.main`,
          }}
        >
          <Iconify icon={meta.icon} width={28} />
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="overline" sx={{ color: `${meta.color}.main` }}>
              Next up · {meta.label}
            </Typography>
            <Label color={status.color}>{status.label}</Label>
          </Stack>
          <Typography
            variant="h6"
            sx={{ textDecoration: cancelled ? 'line-through' : 'none' }}
            noWrap
          >
            {booking.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {details(booking)}
          </Typography>
        </Box>

        <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ flexShrink: 0 }}>
          {!cancelled && (
            <Typography variant="subtitle2" sx={{ color: `${meta.color}.main` }}>
              {startsIn(booking)}
            </Typography>
          )}
          <Button
            component={RouterLink}
            href={paths.dashboard.bookings.details(booking.id)}
            size="small"
            variant="contained"
            color={meta.color}
          >
            View details
          </Button>
        </Stack>
      </Stack>
    );
  };

  return (
    <Card
      sx={(theme) => ({
        mb: 3,
        border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.32)}`,
        boxShadow: `0 0 0 4px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.06)}`,
        background: `linear-gradient(135deg, ${varAlpha(
          theme.vars.palette.primary.mainChannel,
          0.06
        )} 0%, transparent 45%)`,
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            flexShrink: 0,
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
          }}
        >
          <Iconify icon="solar:calendar-date-bold" width={22} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">My upcoming meetings & bookings</Typography>
            {!!bookingsTotal && (
              <Label color="primary" variant="filled">
                {bookingsTotal}
              </Label>
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Meetings you organise or are invited to, and your room / pool-table bookings · times in{' '}
            {PKT_LABEL}
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          {bookings.length ? <CardLink href={paths.dashboard.bookings.list} /> : null}
        </Box>
      </Stack>

      {bookingsLoading ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <Skeleton variant="rounded" height={84} />
        </Box>
      ) : !next ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ px: 2.5, pb: 2.5 }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Nothing booked yet. Meetings you&apos;re invited to will show up here automatically.
          </Typography>
          <BookingNewMenu />
        </Stack>
      ) : (
        <>
          {renderNext(next)}
          {!!rest.length && (
            <DashboardList>
              {rest.map((b) => {
                const meta = BOOKING_TYPE_META[b.type];
                const status = bookingStatusLabel(b);
                const cancelled = b.status === 'CANCELLED';
                return (
                  <DashboardListRow
                    key={b.id}
                    href={paths.dashboard.bookings.details(b.id)}
                    icon={meta.icon}
                    color={cancelled ? 'error' : meta.color}
                    dimmed={cancelled}
                    title={b.title}
                    secondary={details(b)}
                    meta={<Label color={status.color}>{status.label}</Label>}
                  />
                );
              })}
            </DashboardList>
          )}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 2, pb: 2 }}>
            <CardLink href={paths.dashboard.bookings.list} />
          </Box>
        </>
      )}
    </Card>
  );
}
