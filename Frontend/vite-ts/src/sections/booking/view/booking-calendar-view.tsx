import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventInput, DatesSetArg, EventClickArg } from '@fullcalendar/core';
import type {
  BookingDto,
  BookingType,
  BookingStatus,
  CalendarLeave,
} from 'src/actions/bookings';

import Calendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTheme, alpha as hexAlpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  useGetBookings,
  BOOKING_ADMIN_ROLES,
  useGetCalendarLeaves,
  useGetCalendarPeople,
  useGetBookingResources,
  CALENDAR_VIEW_ALL_ROLES,
  MEETING_ORGANIZER_ROLES,
} from 'src/actions/bookings';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { CalendarRoot } from 'src/sections/calendar/styles';

import { useAuthContext } from 'src/auth/hooks';

import { BookingNewMenu, newBookingHref } from '../booking-new-menu';
import {
  addDays,
  PKT_LABEL,
  fPktRange,
  BOOKING_TYPES,
  toPktWallClock,
  BOOKING_TYPE_META,
  calendarDateParts,
} from '../booking-utils';

// ----------------------------------------------------------------------

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

const VIEWS: { value: CalendarView; label: string; icon: string }[] = [
  { value: 'dayGridMonth', label: 'Month', icon: 'mingcute:calendar-month-line' },
  { value: 'timeGridWeek', label: 'Week', icon: 'mingcute:calendar-week-line' },
  { value: 'timeGridDay', label: 'Day', icon: 'mingcute:calendar-day-line' },
  { value: 'listWeek', label: 'Agenda', icon: 'custom:calendar-agenda-outline' },
];

type Filters = {
  type: BookingType | '';
  resourceId: number | '';
  status: BookingStatus | '';
  /** "Calendar of" — '' = everyone the viewer may see (all / their team). */
  userId: number | '';
  scope: 'all' | 'mine';
  showLeaves: boolean;
};

const DEFAULT_FILTERS: Filters = {
  type: '',
  resourceId: '',
  status: '',
  userId: '',
  scope: 'all',
  showLeaves: true,
};

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Bookings calendar — every booking the viewer may see, from the database, in Pakistan time, plus
 * leave (approved, and pending in a lighter dashed style) as all-day events. HR / Admin / CEO can
 * open anyone's calendar and Team Leads their team's (the backend enforces the same rules);
 * meetings outside that only appear when they occupy a room (as a grey "Private meeting" block).
 * Click a free slot (week / day) or a day (month) to book it — organisers get a meeting form;
 * click a booking or a leave to open it. `?date=YYYY-MM-DD&view=timeGridDay` focus a day. The list
 * refreshes every minute and after any change.
 */
export function BookingCalendarView() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const calendarRef = useRef<Calendar>(null);
  const { user } = useAuthContext();
  const role = user?.role ?? '';
  const canOrganize = MEETING_ORGANIZER_ROLES.includes(role);
  const isAdmin = BOOKING_ADMIN_ROLES.includes(role);
  const viewsAll = CALENDAR_VIEW_ALL_ROLES.includes(role);
  // Team Members only ever see their own calendar, so they get no "Calendar of" picker.
  const canPickCalendar = viewsAll || role === 'MANAGER';

  const dateParam = searchParams.get('date');
  const focusDate = dateParam && DATE_PARAM.test(dateParam) ? dateParam : undefined;
  const viewParam = VIEWS.find((v) => v.value === searchParams.get('view'))?.value;

  const [view, setView] = useState<CalendarView>(
    viewParam ?? (isMobile ? 'listWeek' : 'timeGridWeek')
  );
  const [title, setTitle] = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Following an "Open in calendar" link while the calendar is already open.
  useEffect(() => {
    const calendar = calendarRef.current?.getApi();
    if (!calendar) return;
    if (viewParam) {
      setView(viewParam);
      calendar.changeView(viewParam);
    }
    if (focusDate) calendar.gotoDate(focusDate);
  }, [focusDate, viewParam]);

  const { bookings, bookingsLoading, bookingsValidating } = useGetBookings(
    {
      from: range?.from,
      to: range?.to,
      type: filters.type,
      resourceId: filters.resourceId,
      status: filters.status,
      userId: filters.userId,
      scope: filters.scope,
      limit: 500,
    },
    !!range
  );
  const { resources } = useGetBookingResources();
  const { calendarPeople } = useGetCalendarPeople(canPickCalendar);
  // "Only mine" narrows leave to the viewer's own, like it does for bookings.
  const leavesUserId = filters.userId || (filters.scope === 'mine' && user?.id ? Number(user.id) : '');
  const { leaves: fetchedLeaves, leavesLoading } = useGetCalendarLeaves(
    { from: range?.from, to: range?.to, userId: leavesUserId },
    !!range && filters.showLeaves
  );
  const leaves = useMemo(
    () => (filters.showLeaves ? fetchedLeaves : []),
    [filters.showLeaves, fetchedLeaves]
  );

  const colorFor = useCallback(
    (booking: BookingDto) => {
      if (booking.status === 'CANCELLED' || booking.isPrivate) return theme.palette.grey[500];
      return theme.palette[BOOKING_TYPE_META[booking.type].color].main;
    },
    [theme]
  );

  const events: EventInput[] = useMemo(
    () =>
      bookings.map((booking) => {
        const color = colorFor(booking);
        const who = booking.organizer?.name;
        const label = booking.isPrivate
          ? `${booking.resource?.name ?? 'Room'} · Private meeting`
          : booking.type === 'MEETING'
            ? booking.title
            : `${booking.resource?.name ?? ''}${who ? ` · ${who}` : ''}`;
        return {
          id: String(booking.id),
          title: booking.status === 'CANCELLED' ? `Cancelled: ${label}` : label,
          start: toPktWallClock(booking.startAt),
          end: toPktWallClock(booking.endAt),
          backgroundColor: hexAlpha(color, booking.status === 'CANCELLED' ? 0.12 : 0.18),
          borderColor: color,
          textColor: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
          classNames: [
            'bnw-booking',
            booking.status === 'CANCELLED' ? 'bnw-booking--cancelled' : '',
            booking.isPrivate ? 'bnw-booking--private' : '',
          ],
          extendedProps: { booking },
        };
      }),
    [bookings, colorFor, theme]
  );

  const leaveEvents: EventInput[] = useMemo(
    () =>
      leaves.map((leave) => {
        const color = theme.palette.warning.main;
        const own = !!user?.id && leave.userId === Number(user.id);
        const what = `${leave.leaveTypeName}${leave.halfDay ? ', half day' : ''}`;
        const label = own ? `You: ${what}` : `On leave: ${leave.employeeName} (${what})`;
        return {
          id: `leave-${leave.id}`,
          title: leave.isPending ? `${label} · pending` : label,
          start: leave.startDate,
          // All-day ends are exclusive.
          end: addDays(leave.endDate, 1),
          allDay: true,
          backgroundColor: hexAlpha(color, leave.isPending ? 0.08 : 0.24),
          borderColor: color,
          textColor:
            theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
          classNames: ['bnw-leave', leave.isPending ? 'bnw-leave--pending' : ''],
          extendedProps: { leave },
        };
      }),
    [leaves, theme, user?.id]
  );

  const allEvents = useMemo(() => [...leaveEvents, ...events], [leaveEvents, events]);

  const api = () => calendarRef.current?.getApi();

  const handleDatesSet = (arg: DatesSetArg) => {
    setTitle(arg.view.title);
    // `end` is exclusive; the API wants the last day.
    const from = calendarDateParts(arg.start).date;
    const to = addDays(calendarDateParts(arg.end).date, -1);
    setRange((prev) => (prev?.from === from && prev?.to === to ? prev : { from, to }));
  };

  const handleChangeView = (next: CalendarView | null) => {
    if (!next) return;
    setView(next);
    api()?.changeView(next);
  };

  const nowWallClock = toPktWallClock(new Date());

  const handleEventClick = (arg: EventClickArg) => {
    const leave = arg.event.extendedProps.leave as CalendarLeave | undefined;
    if (leave) {
      // `canOpen` (own, HR / Admin / CEO, or the employee's Team Lead) mirrors the leave module.
      if (leave.canOpen) {
        router.push(paths.dashboard.leaveRequests.details(leave.id));
        return;
      }
      const dates =
        leave.startDate === leave.endDate
          ? fDate(leave.startDate)
          : `${fDate(leave.startDate)} – ${fDate(leave.endDate)}`;
      toast.info(
        `${leave.employeeName} is ${leave.isPending ? 'requesting leave' : 'on leave'}: ${dates}`
      );
      return;
    }
    const booking = arg.event.extendedProps.booking as BookingDto;
    if (booking.isPrivate) {
      toast.info(
        `${booking.resource?.name ?? 'This room'} is booked for a private meeting, ${fPktRange(booking.startAt, booking.endAt)}`
      );
      return;
    }
    router.push(paths.dashboard.bookings.details(booking.id));
  };

  // Organisers clicking a free slot get the meeting form, pre-set to that day / time.
  const slotType: BookingType | undefined = canOrganize ? 'MEETING' : undefined;

  const handleDateClick = (arg: DateClickArg) => {
    const { date, time } = calendarDateParts(arg.date);
    if (arg.allDay) {
      if (date < nowWallClock.slice(0, 10)) return;
      router.push(newBookingHref({ type: slotType, date }));
      return;
    }
    if (`${date}T${time}` < nowWallClock.slice(0, 16)) return;
    router.push(newBookingHref({ type: slotType, date, time }));
  };

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const filtersActive =
    !!filters.type ||
    !!filters.resourceId ||
    !!filters.status ||
    !!filters.userId ||
    filters.scope === 'mine' ||
    !filters.showLeaves;

  const renderToolbar = () => (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ p: 2.5, pr: 2 }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton aria-label="Previous" onClick={() => api()?.prev()}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>
        <Button size="small" variant="outlined" color="inherit" onClick={() => api()?.today()}>
          Today
        </Button>
        <IconButton aria-label="Next" onClick={() => api()?.next()}>
          <Iconify icon="eva:arrow-ios-forward-fill" />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }} aria-live="polite">
          {title}
        </Typography>
      </Stack>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_, next) => handleChangeView(next)}
        aria-label="Calendar view"
      >
        {VIEWS.map((v) => (
          <ToggleButton key={v.value} value={v.value} sx={{ gap: 0.75, px: 1.5 }}>
            <Iconify icon={v.icon as 'mingcute:calendar-month-line'} width={18} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {v.label}
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );

  const renderFilters = () => (
    <Box
      sx={{
        px: 2.5,
        pb: 2,
        gap: 1.5,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr 1fr',
          md: canPickCalendar
            ? 'repeat(5, minmax(0, 1fr)) auto auto'
            : 'repeat(4, minmax(0, 1fr)) auto auto',
        },
      }}
    >
      {canPickCalendar && (
        <TextField
          select
          size="small"
          label="Calendar of"
          value={filters.userId}
          onChange={(e) => setFilter('userId', e.target.value === '' ? '' : Number(e.target.value))}
          slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } } } }}
        >
          <MenuItem value="">{viewsAll ? 'Everyone' : 'My team (all)'}</MenuItem>
          {calendarPeople.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.isSelf ? `${p.name} (me)` : p.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField
        select
        size="small"
        label="Show"
        value={filters.scope}
        onChange={(e) => setFilter('scope', e.target.value as Filters['scope'])}
      >
        <MenuItem value="all">All bookings</MenuItem>
        <MenuItem value="mine">Only mine</MenuItem>
      </TextField>
      <TextField
        select
        size="small"
        label="Type"
        value={filters.type}
        onChange={(e) => setFilter('type', e.target.value as Filters['type'])}
      >
        <MenuItem value="">All types</MenuItem>
        {BOOKING_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {BOOKING_TYPE_META[type].label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Room / table"
        value={filters.resourceId}
        onChange={(e) => setFilter('resourceId', e.target.value === '' ? '' : Number(e.target.value))}
      >
        <MenuItem value="">All rooms & tables</MenuItem>
        {resources.map((r) => (
          <MenuItem key={r.id} value={r.id}>
            {r.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Status"
        value={filters.status}
        onChange={(e) => setFilter('status', e.target.value as Filters['status'])}
      >
        <MenuItem value="">Any status</MenuItem>
        <MenuItem value="CONFIRMED">Confirmed</MenuItem>
        <MenuItem value="CANCELLED">Cancelled</MenuItem>
      </TextField>
      <FormControlLabel
        label="Show leaves"
        control={
          <Switch
            checked={filters.showLeaves}
            onChange={(e) => setFilter('showLeaves', e.target.checked)}
          />
        }
        sx={{ mx: 0, whiteSpace: 'nowrap' }}
      />
      <Button
        color="inherit"
        disabled={!filtersActive}
        onClick={() => setFilters(DEFAULT_FILTERS)}
        startIcon={<Iconify icon="solar:restart-bold" />}
      >
        Reset
      </Button>
    </Box>
  );

  const renderLegend = () => (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={2}
      sx={{ px: 2.5, pb: 2, typography: 'caption', color: 'text.secondary' }}
    >
      {BOOKING_TYPES.map((type) => (
        <Stack key={type} direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.5,
              bgcolor: `${BOOKING_TYPE_META[type].color}.main`,
            }}
          />
          <span>{BOOKING_TYPE_META[type].label}</span>
        </Stack>
      ))}
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'grey.500' }} />
        <span>Private meeting (room busy) / cancelled</span>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'warning.main' }} />
        <span>On leave</span>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: 0.5,
            border: (t) => `1px dashed ${t.palette.warning.main}`,
            bgcolor: (t) => hexAlpha(t.palette.warning.main, 0.08),
          }}
        />
        <span>Leave pending approval</span>
      </Stack>
      <Box component="span" sx={{ ml: 'auto !important' }}>
        All times {PKT_LABEL} · Click a free slot to book it
      </Box>
    </Stack>
  );

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Bookings"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Bookings' }]}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
            {isAdmin && (
              <Button
                component={RouterLink}
                href={paths.dashboard.bookings.resources}
                color="inherit"
                variant="outlined"
                startIcon={<Iconify icon="solar:settings-bold" />}
              >
                Rooms & tables
              </Button>
            )}
            <Button
              component={RouterLink}
              href={paths.dashboard.bookings.list}
              color="inherit"
              variant="outlined"
              startIcon={<Iconify icon="solar:list-bold" />}
            >
              My bookings
            </Button>
            <BookingNewMenu />
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <Card sx={{ position: 'relative' }}>
        {(bookingsLoading || bookingsValidating || leavesLoading) && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }} />
        )}
        {renderToolbar()}
        {renderFilters()}
        {renderLegend()}

        <CalendarRoot
          sx={{
            '& .bnw-booking': { borderLeftWidth: 3, cursor: 'pointer' },
            '& .bnw-booking--cancelled .fc-event-title, & .bnw-booking--cancelled .fc-list-event-title':
              { textDecoration: 'line-through' },
            '& .bnw-booking--private': { cursor: 'default', fontStyle: 'italic' },
            '& .bnw-leave': { borderLeftWidth: 3, cursor: 'pointer' },
            '& .bnw-leave--pending': { borderStyle: 'dashed', fontStyle: 'italic' },
          }}
        >
          <Calendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={view}
            initialDate={focusDate}
            headerToolbar={false}
            timeZone="UTC"
            now={nowWallClock}
            nowIndicator
            firstDay={1}
            weekends
            allDaySlot
            allDayText="Leave"
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            scrollTime="08:00:00"
            slotDuration="00:30:00"
            height="auto"
            expandRows
            dayMaxEventRows={3}
            eventDisplay="block"
            displayEventEnd
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            events={allEvents}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            noEventsText="No bookings in this period"
          />
        </CalendarRoot>
      </Card>
    </DashboardContent>
  );
}
