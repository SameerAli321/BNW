import type { ReactNode } from 'react';

import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { cancelBooking, useGetBooking } from 'src/actions/bookings';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import {
  fDuration,
  fPktRange,
  bookingPlace,
  BOOKING_TYPE_META,
  bookingStatusLabel,
} from '../booking-utils';

// ----------------------------------------------------------------------

type Props = { id: string };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 140, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ typography: 'body2', minWidth: 0, wordBreak: 'break-word' }}>{children}</Box>
    </Stack>
  );
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * One booking: when, where, who organised it and who's invited. The organiser (or whoever booked
 * it; HR / Admin for rooms and tables) can edit, reschedule or cancel it while it's upcoming.
 * Meetings are only visible to their organiser and participants, HR / Admin / CEO and the Team
 * Lead of someone involved (the backend returns 403 otherwise).
 */
export function BookingDetailsView({ id }: Props) {
  const { booking, bookingLoading, bookingError } = useGetBooking(id);
  const confirmCancel = useBoolean();
  const [reason, setReason] = useState('');
  const [cancelScope, setCancelScope] = useState<'ONE' | 'FOLLOWING'>('ONE');
  const [cancelling, setCancelling] = useState(false);

  const breadcrumbs = (heading: string, action?: ReactNode) => (
    <CustomBreadcrumbs
      heading={heading}
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Bookings', href: paths.dashboard.bookings.root },
        { name: heading },
      ]}
      action={action}
      sx={{ mb: { xs: 3, md: 4 } }}
    />
  );

  if (bookingLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (bookingError || !booking) {
    return (
      <DashboardContent>
        {breadcrumbs('Booking')}
        <EmptyContent
          filled
          title="Unable to show this booking"
          description={
            bookingError instanceof Error && /not invited/i.test(bookingError.message)
              ? 'This meeting is private — only the organiser and invited employees can see it.'
              : "Either it doesn't exist, or you don't have permission to view it."
          }
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  const meta = BOOKING_TYPE_META[booking.type];
  const status = bookingStatusLabel(booking);
  const isMeeting = booking.type === 'MEETING';
  const canChange = booking.canManage && booking.status === 'CONFIRMED' && !booking.isPast;

  const onCancel = async () => {
    setCancelling(true);
    try {
      await cancelBooking(booking.id, reason.trim() || undefined, cancelScope);
      toast.success(
        isMeeting ? 'Meeting cancelled — participants have been notified' : 'Booking cancelled'
      );
      confirmCancel.onFalse();
      setReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel the booking');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <DashboardContent>
      {breadcrumbs(
        booking.title,
        // The calendar, on this booking's day (Day view).
        <Button
          component={RouterLink}
          href={`${paths.dashboard.bookings.root}?date=${booking.date}&view=timeGridDay`}
          color="inherit"
          variant="outlined"
          startIcon={<Iconify icon="solar:calendar-date-bold" />}
        >
          Open in calendar
        </Button>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Label color={meta.color} startIcon={<Iconify icon={meta.icon} />}>
                  {meta.label}
                </Label>
                <Label color={status.color}>{status.label}</Label>
              </Stack>

              {booking.status === 'CANCELLED' && (
                <Alert severity="error">
                  Cancelled{booking.cancelledBy ? ` by ${booking.cancelledBy.name}` : ''}
                  {booking.cancelledAt ? ` on ${fDateTime(booking.cancelledAt)}` : ''}.
                  {booking.cancelReason ? ` Reason: ${booking.cancelReason}` : ''}
                </Alert>
              )}

              <Stack spacing={1.75}>
                <Row label="When">{fPktRange(booking.startAt, booking.endAt)}</Row>
                <Row label="Duration">{fDuration(booking.durationMinutes)}</Row>
                <Row
                  label={
                    isMeeting
                      ? 'Room / location'
                      : booking.type === 'POOL_TABLE'
                        ? 'Pool table'
                        : 'Room'
                  }
                >
                  {bookingPlace(booking) || '—'}
                  {booking.resource?.location ? ` · ${booking.resource.location}` : ''}
                </Row>
                <Row label={isMeeting ? 'Organiser' : 'Booked by'}>
                  {booking.organizer?.name ?? '—'}
                  {booking.organizer?.designation ? ` · ${booking.organizer.designation}` : ''}
                </Row>
                {isMeeting && booking.purpose && <Row label="Purpose">{booking.purpose}</Row>}
                {booking.description && (
                  <Row label={isMeeting ? 'Description / agenda' : 'Notes'}>
                    <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                      {booking.description}
                    </Box>
                  </Row>
                )}
                <Row label="Created">
                  {fDateTime(booking.createdAt)}
                  {booking.createdBy && booking.createdBy.id !== booking.organizer?.id
                    ? ` by ${booking.createdBy.name}`
                    : ''}
                </Row>
                {booking.updatedAt !== booking.createdAt && (
                  <Row label="Last updated">{fDateTime(booking.updatedAt)}</Row>
                )}
              </Stack>

              {canChange && (
                <>
                  <Divider sx={{ borderStyle: 'dashed' }} />
                  <Stack
                    direction="row"
                    spacing={1.5}
                    justifyContent="flex-end"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:close-circle-bold" />}
                      onClick={confirmCancel.onTrue}
                    >
                      Cancel {isMeeting ? 'meeting' : 'booking'}
                    </Button>
                    <Button
                      component={RouterLink}
                      href={paths.dashboard.bookings.edit(booking.id)}
                      variant="contained"
                      startIcon={<Iconify icon="solar:pen-bold" />}
                    >
                      Edit / reschedule
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {isMeeting ? (
            <Card sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Participants ({booking.participants.length + 1})
              </Typography>
              <Stack spacing={1.5} component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {[
                  ...(booking.organizer ? [{ ...booking.organizer, organiser: true }] : []),
                  ...booking.participants.map((p) => ({ ...p, organiser: false })),
                ].map((p) => (
                  <Stack
                    key={p.id}
                    component="li"
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                  >
                    <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>{initials(p.name)}</Avatar>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                        {p.designation ?? '—'}
                      </Typography>
                    </Box>
                    {p.organiser && <Label color="primary">Organiser</Label>}
                  </Stack>
                ))}
              </Stack>
            </Card>
          ) : (
            <Card sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {booking.resource?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {booking.resource?.capacity ? `${booking.resource.capacity} seats` : null}
                {booking.resource?.capacity && booking.resource?.location ? ' · ' : null}
                {booking.resource?.location}
                {!booking.resource?.capacity && !booking.resource?.location
                  ? 'Reserved for this time slot. Others see it as booked on the calendar.'
                  : null}
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirmCancel.value}
        onClose={confirmCancel.onFalse}
        title={`Cancel this ${isMeeting ? 'meeting' : 'booking'}?`}
        content={
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              {isMeeting
                ? `${booking.title} (${fPktRange(booking.startAt, booking.endAt)}) will be cancelled and all ${booking.participants.length} participant(s) will be notified. The room becomes free again.`
                : `The slot (${fPktRange(booking.startAt, booking.endAt)}) becomes free for others.`}
            </Typography>
            {booking.seriesId && (
              <TextField
                select
                label="This booking repeats"
                value={cancelScope}
                onChange={(e) => setCancelScope(e.target.value as 'ONE' | 'FOLLOWING')}
                fullWidth
              >
                <MenuItem value="ONE">Cancel only this one</MenuItem>
                <MenuItem value="FOLLOWING">Cancel this and all later ones</MenuItem>
              </TextField>
            )}
            <TextField
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
          </Stack>
        }
        action={
          <Button variant="contained" color="error" loading={cancelling} onClick={onCancel}>
            Yes, cancel it
          </Button>
        }
      />
    </DashboardContent>
  );
}
