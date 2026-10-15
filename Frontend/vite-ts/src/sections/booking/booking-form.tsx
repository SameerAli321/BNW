import type {
  BookingDto,
  BookingType,
  BookingPayload,
  BookingPickerPerson,
} from 'src/actions/bookings';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  createBooking,
  updateBooking,
  useGetBookingPeople,
  useGetBookingResources,
  MEETING_ORGANIZER_ROLES,
} from 'src/actions/bookings';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { BookingAvailabilityPanel } from './booking-availability';
import {
  fClock,
  pktToday,
  DURATIONS,
  fDuration,
  pktToDate,
  START_TIMES,
  BOOKING_TYPES,
  BOOKING_TYPE_META,
} from './booking-utils';

// ----------------------------------------------------------------------

type Props = {
  /** Editing / rescheduling an existing booking (its type can't change). */
  currentBooking?: BookingDto;
  initialType?: BookingType;
  initialDate?: string;
  initialTime?: string;
};

type FormState = {
  type: BookingType;
  title: string;
  purpose: string;
  description: string;
  date: string;
  time: string;
  durationMinutes: number;
  resourceId: number | '';
  location: string;
  participants: BookingPickerPerson[];
};

/** Next quarter-hour from now in PKT, within the bookable hours. */
function defaultTime(date: string): string {
  if (date !== pktToday()) return '10:00';
  const now = new Date(Date.now() + 5 * 3600_000);
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const next = START_TIMES.find((t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m > minutes;
  });
  return next ?? '10:00';
}

/**
 * One form for all three booking types: meeting (title, purpose, participants from the employee
 * list, optional room or a free-text location), meeting room, pool table. The panel on the right
 * shows the chosen room / table's bookings that day and who among the participants is busy, so
 * clashes are visible before saving — the backend still has the final say.
 */
export function BookingForm({ currentBooking, initialType, initialDate, initialTime }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const canOrganize = MEETING_ORGANIZER_ROLES.includes(user?.role ?? '');
  const isEdit = !!currentBooking;

  const startType: BookingType =
    currentBooking?.type ??
    (initialType && (initialType !== 'MEETING' || canOrganize) ? initialType : undefined) ??
    (canOrganize ? 'MEETING' : 'MEETING_ROOM');
  const startDate =
    currentBooking?.date ?? (initialDate && initialDate >= pktToday() ? initialDate : pktToday());

  const [form, setForm] = useState<FormState>(() => ({
    type: startType,
    title: currentBooking && !currentBooking.isPrivate ? currentBooking.title : '',
    purpose: currentBooking?.purpose ?? '',
    description: currentBooking?.description ?? '',
    date: startDate,
    time:
      currentBooking?.time ??
      (initialTime && START_TIMES.includes(initialTime) ? initialTime : defaultTime(startDate)),
    durationMinutes: currentBooking?.durationMinutes ?? (startType === 'POOL_TABLE' ? 30 : 60),
    resourceId: currentBooking?.resource?.id ?? '',
    location: currentBooking?.location ?? '',
    participants: (currentBooking?.participants ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      designation: p.designation,
      department: null,
    })),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setServerError(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isMeeting = form.type === 'MEETING';
  const resourceType = form.type === 'POOL_TABLE' ? 'POOL_TABLE' : 'MEETING_ROOM';
  const { resources, resourcesLoading } = useGetBookingResources({ type: resourceType });
  const { people, peopleLoading } = useGetBookingPeople(isMeeting && canOrganize);

  // Keep the booking's current room in the list even if it has since been deactivated.
  const resourceOptions = useMemo(() => {
    const current = currentBooking?.resource;
    if (current && current.type === resourceType && !resources.some((r) => r.id === current.id)) {
      return [...resources, current];
    }
    return resources;
  }, [resources, currentBooking?.resource, resourceType]);

  const pickable = useMemo(() => people.filter((p) => p.id !== user?.id), [people, user?.id]);
  const selectedResource = resourceOptions.find((r) => r.id === form.resourceId) ?? null;

  const handleTypeChange = (type: BookingType | null) => {
    if (!type || isEdit) return;
    setServerError(null);
    setForm((prev) => ({
      ...prev,
      type,
      resourceId: '',
      durationMinutes: type === 'POOL_TABLE' ? 30 : prev.durationMinutes,
    }));
  };

  // ------------------------------------------------------------------ validation

  const start = pktToDate(form.date, form.time);
  const startMoved =
    !currentBooking ||
    currentBooking.date !== form.date ||
    currentBooking.time !== form.time;
  const problems: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) problems.push('Pick a date');
  else if (startMoved && start.getTime() < Date.now()) problems.push('Pick a start time in the future');
  if (isMeeting && !form.title.trim()) problems.push('Give the meeting a title');
  if (isMeeting && !form.participants.length) problems.push('Invite at least one employee');
  if (!isMeeting && form.resourceId === '') {
    problems.push(form.type === 'POOL_TABLE' ? 'Pick a pool table' : 'Pick a meeting room');
  }

  const onSubmit = async () => {
    if (problems.length) {
      toast.error(problems[0]);
      return;
    }
    const payload: BookingPayload = {
      title: form.title.trim() || undefined,
      purpose: isMeeting ? form.purpose.trim() || null : null,
      description: form.description.trim() || null,
      date: form.date,
      time: form.time,
      durationMinutes: form.durationMinutes,
      resourceId: form.resourceId === '' ? null : form.resourceId,
      location: isMeeting && form.resourceId === '' ? form.location.trim() || null : null,
      participantIds: isMeeting ? form.participants.map((p) => p.id) : [],
    };

    setSubmitting(true);
    setServerError(null);
    try {
      const saved = isEdit
        ? await updateBooking(currentBooking.id, payload)
        : await createBooking({ ...payload, type: form.type });
      toast.success(
        isEdit
          ? 'Booking updated'
          : isMeeting
            ? `Meeting booked — ${form.participants.length} employee(s) invited`
            : 'Booking confirmed'
      );
      router.push(paths.dashboard.bookings.details(saved.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save the booking';
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------ render

  const renderTypePicker = () => (
    <ToggleButtonGroup
      exclusive
      fullWidth
      value={form.type}
      onChange={(_, value) => handleTypeChange(value)}
      aria-label="What do you want to book?"
      sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
    >
      {BOOKING_TYPES.map((type) => {
        const meta = BOOKING_TYPE_META[type];
        const disabled = (isEdit && type !== form.type) || (type === 'MEETING' && !canOrganize);
        const button = (
          <ToggleButton
            key={type}
            value={type}
            disabled={disabled}
            sx={{ gap: 1, py: 1.25, flex: 1, minWidth: { xs: '100%', sm: 0 } }}
          >
            <Iconify icon={meta.icon} width={20} />
            {meta.label}
          </ToggleButton>
        );
        return type === 'MEETING' && !canOrganize && !isEdit ? (
          <Tooltip key={type} title="Meetings are organised by the CEO, HR / Admin and Team Leads">
            <span style={{ flex: 1 }}>{button}</span>
          </Tooltip>
        ) : (
          button
        );
      })}
    </ToggleButtonGroup>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            {renderTypePicker()}
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: -1.5 }}>
              {BOOKING_TYPE_META[form.type].description}
            </Typography>

            <TextField
              label={isMeeting ? 'Meeting title' : 'Title (optional)'}
              required={isMeeting}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              placeholder={isMeeting ? 'e.g. Quarterly review' : selectedResource ? `${selectedResource.name} booking` : ''}
            />

            {isMeeting && (
              <TextField
                label="Purpose"
                value={form.purpose}
                onChange={(e) => set('purpose', e.target.value)}
                slotProps={{ htmlInput: { maxLength: 300 } }}
                placeholder="e.g. Review Q1 client deliverables"
              />
            )}

            <Box
              sx={{
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr' },
              }}
            >
              <TextField
                type="date"
                label="Date"
                required
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: pktToday() } }}
              />
              <TextField
                select
                label="Start time (PKT)"
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
                slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } } } }}
              >
                {(START_TIMES.includes(form.time) ? START_TIMES : [form.time, ...START_TIMES]).map(
                  (t) => (
                    <MenuItem key={t} value={t}>
                      {fClock(t)}
                    </MenuItem>
                  )
                )}
              </TextField>
              <TextField
                select
                label="Duration"
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', Number(e.target.value))}
              >
                {(DURATIONS.includes(form.durationMinutes)
                  ? DURATIONS
                  : [...DURATIONS, form.durationMinutes].sort((a, b) => a - b)
                ).map((d) => (
                  <MenuItem key={d} value={d}>
                    {fDuration(d)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <TextField
              select
              label={
                isMeeting
                  ? 'Meeting room (optional)'
                  : form.type === 'POOL_TABLE'
                    ? 'Pool table'
                    : 'Meeting room'
              }
              required={!isMeeting}
              value={form.resourceId}
              onChange={(e) => set('resourceId', e.target.value === '' ? '' : Number(e.target.value))}
              disabled={resourcesLoading}
              helperText={
                !resourcesLoading && !resourceOptions.length
                  ? 'None set up yet — HR / Admin add them under Bookings → Rooms & tables.'
                  : undefined
              }
            >
              {isMeeting && (
                <MenuItem value="">
                  <em>No room — enter a location instead</em>
                </MenuItem>
              )}
              {resourceOptions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                  {r.capacity ? ` · ${r.capacity} seats` : ''}
                  {r.location ? ` · ${r.location}` : ''}
                </MenuItem>
              ))}
            </TextField>

            {isMeeting && form.resourceId === '' && (
              <TextField
                label="Location"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                slotProps={{ htmlInput: { maxLength: 300 } }}
                placeholder="e.g. Online — Microsoft Teams, or the client's office"
              />
            )}

            {isMeeting && (
              <Autocomplete
                multiple
                options={pickable}
                loading={peopleLoading}
                value={form.participants}
                onChange={(_, value) => set('participants', value)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                getOptionLabel={(p) => p.name}
                filterSelectedOptions
                renderOption={(props, p) => {
                  const { key, ...rest } = props as typeof props & { key: string };
                  return (
                    <li key={key} {...rest}>
                      <Box>
                        <Typography variant="body2">{p.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {[p.designation, p.department].filter(Boolean).join(' · ') || '—'}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Participants"
                    placeholder={form.participants.length ? '' : 'Search employees'}
                    helperText="Invited employees see the meeting on their dashboard and get an email invite."
                  />
                )}
              />
            )}

            <TextField
              label={isMeeting ? 'Description / agenda' : 'Notes (optional)'}
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              slotProps={{ htmlInput: { maxLength: 5000 } }}
            />

            {serverError && <Alert severity="error">{serverError}</Alert>}

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                color="inherit"
                variant="outlined"
                onClick={() =>
                  router.push(
                    isEdit
                      ? paths.dashboard.bookings.details(currentBooking.id)
                      : paths.dashboard.bookings.root
                  )
                }
              >
                Cancel
              </Button>
              <Button variant="contained" loading={submitting} onClick={onSubmit}>
                {isEdit ? 'Save changes' : 'Confirm booking'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <BookingAvailabilityPanel
          date={form.date}
          time={form.time}
          durationMinutes={form.durationMinutes}
          resource={selectedResource}
          participants={isMeeting ? form.participants : []}
          organizerId={isMeeting ? (currentBooking?.organizer?.id ?? user?.id) : undefined}
          excludeBookingId={currentBooking?.id}
          onPickTime={(t) => set('time', t)}
        />
      </Grid>
    </Grid>
  );
}
