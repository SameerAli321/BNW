import type { BookingType } from 'src/actions/bookings';

import { useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useGetBookings } from 'src/actions/bookings';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BookingNewMenu } from '../booking-new-menu';
import {
  fPktTime,
  fPktDate,
  fDuration,
  bookingPlace,
  BOOKING_TYPES,
  BOOKING_TYPE_META,
  bookingStatusLabel,
} from '../booking-utils';

// ----------------------------------------------------------------------

/**
 * Booking records as a searchable list: upcoming / past, only mine (organised, booked or invited
 * to) or everything visible to me, filtered by type. Rows open the booking.
 */
export function BookingListView() {
  const router = useRouter();
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [type, setType] = useState<BookingType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const { bookings, bookingsTotal, bookingsLoading, bookingsValidating } = useGetBookings({
    when,
    scope,
    type,
    search: debouncedSearch,
    page: page + 1,
    limit: rowsPerPage,
  });

  const resetPage = () => setPage(0);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="My bookings"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookings', href: paths.dashboard.bookings.root },
          { name: 'My bookings' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              href={paths.dashboard.bookings.root}
              color="inherit"
              variant="outlined"
              startIcon={<Iconify icon="solar:calendar-date-bold" />}
            >
              Calendar
            </Button>
            <BookingNewMenu />
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <Card sx={{ position: 'relative' }}>
        {bookingsValidating && !bookingsLoading && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }} />
        )}
        <Tabs
          value={when}
          onChange={(_, value) => {
            setWhen(value);
            resetPage();
          }}
          sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
        >
          <Tab value="upcoming" label="Upcoming" />
          <Tab value="past" label="Past" />
        </Tabs>

        <Box
          sx={{
            p: 2.5,
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '200px 200px 1fr' },
          }}
        >
          <TextField
            select
            size="small"
            label="Show"
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as 'mine' | 'all');
              resetPage();
            }}
          >
            <MenuItem value="mine">Only mine</MenuItem>
            <MenuItem value="all">Everything I can see</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as BookingType | '');
              resetPage();
            }}
          >
            <MenuItem value="">All types</MenuItem>
            {BOOKING_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {BOOKING_TYPE_META[t].label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Search by title or organiser…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <TableContainer sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Booking</TableCell>
                  <TableCell>When (PKT)</TableCell>
                  <TableCell>Room / location</TableCell>
                  <TableCell>Organiser</TableCell>
                  <TableCell align="center">Participants</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookingsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                ) : !bookings.length ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyContent
                        title={when === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
                        description={
                          debouncedSearch || type
                            ? 'Try clearing the search or filters.'
                            : 'Use "New booking" to book a meeting, a room or the pool table.'
                        }
                        sx={{ py: 6 }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => {
                    const meta = BOOKING_TYPE_META[booking.type];
                    const status = bookingStatusLabel(booking);
                    return (
                      <TableRow
                        key={booking.id}
                        hover
                        tabIndex={0}
                        onClick={() => router.push(paths.dashboard.bookings.details(booking.id))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push(paths.dashboard.bookings.details(booking.id));
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Iconify icon={meta.icon} sx={{ color: `${meta.color}.main`, flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap sx={{ maxWidth: 260 }}>
                                {booking.title}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {meta.label}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2">{fPktDate(booking.startAt)}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {fPktTime(booking.startAt)} – {fPktTime(booking.endAt)} ·{' '}
                            {fDuration(booking.durationMinutes)}
                          </Typography>
                        </TableCell>
                        <TableCell>{bookingPlace(booking) || '—'}</TableCell>
                        <TableCell>{booking.organizer?.name ?? '—'}</TableCell>
                        <TableCell align="center">
                          {booking.type === 'MEETING' ? booking.participants.length : '—'}
                        </TableCell>
                        <TableCell>
                          <Label color={status.color}>{status.label}</Label>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePagination
          component="div"
          count={bookingsTotal}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, next) => setPage(next)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            resetPage();
          }}
        />
      </Card>
    </DashboardContent>
  );
}
