import type { UserDto } from 'src/types/user';
import type { CandidateDto } from 'src/types/candidate';
import type {
  InterviewDto,
  EmailPreview,
  InterviewMode,
  ScheduleInterviewPayload,
} from 'src/actions/interviews';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useGetUsers } from 'src/actions/users';
import {
  useGetMailStatus,
  scheduleInterview,
  rescheduleInterview,
  previewInterviewEmail,
} from 'src/actions/interviews';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const DURATIONS = [15, 30, 45, 60, 90, 120];
const LOCATION_STORAGE_KEY = 'bnw.interview.lastLocation';
const PLACEHOLDER_EMAIL_DOMAIN = '@pending.local';

/** Today in Pakistan time, 'YYYY-MM-DD' — the earliest date the picker allows. */
function todayPkt(): string {
  return new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
}

function readStoredLocation(): string {
  try {
    return localStorage.getItem(LOCATION_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** The email as the candidate will see it; the inline logo is swapped for the app's copy. */
function EmailPreviewFrame({ preview }: { preview: EmailPreview }) {
  const html = preview.html.replace(/cid:bnw-logo/g, `${window.location.origin}/logo/logo-full.png`);
  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Subject
        </Typography>
        <Typography variant="subtitle2">{preview.subject}</Typography>
      </Box>
      <Box
        component="iframe"
        title="Email preview"
        srcDoc={html}
        sandbox=""
        sx={{
          width: 1,
          height: 540,
          border: (theme) => `1px solid ${theme.vars.palette.divider}`,
          borderRadius: 1,
          bgcolor: '#f4f6f8',
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        A calendar invite (.ics) is attached to the real email so the candidate can add it to
        their calendar in one click.
      </Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  candidate: Pick<CandidateDto, 'id' | 'name' | 'email'>;
  /** When set, the dialog reschedules / edits this interview instead of creating one. */
  current?: InterviewDto;
};

/**
 * Schedule (or reschedule) an interview: date, time (Pakistan time), format, link / location,
 * interviewers and an optional note — with a "Preview email" step showing exactly what the
 * candidate will receive before anything is sent.
 */
export function InterviewScheduleDialog({ open, onClose, candidate, current }: Props) {
  const { users } = useGetUsers({ limit: 200 });
  const { mailStatus } = useGetMailStatus();

  const [date, setDate] = useState(current?.date ?? '');
  const [time, setTime] = useState(current?.time ?? '');
  const [durationMinutes, setDurationMinutes] = useState(current?.durationMinutes ?? 30);
  const [mode, setMode] = useState<InterviewMode>(current?.mode ?? 'ONLINE');
  const [meetingLink, setMeetingLink] = useState(current?.meetingLink ?? '');
  const [location, setLocation] = useState(current?.location ?? readStoredLocation());
  const [interviewerIds, setInterviewerIds] = useState<number[]>(
    current?.interviewers.map((i) => i.id) ?? []
  );
  const [message, setMessage] = useState(current?.message ?? '');
  const [notify, setNotify] = useState(true);

  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);

  const staff = useMemo(() => users.filter((u) => u.status !== 'INACTIVE'), [users]);
  const selectedStaff = useMemo(
    () => staff.filter((u) => interviewerIds.includes(u.id)),
    [staff, interviewerIds]
  );

  const placeholderEmail = candidate.email.toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);
  const emailOff = mailStatus && !mailStatus.configured;

  const payload = (): ScheduleInterviewPayload | null => {
    if (!date || !time) {
      toast.error('Pick the interview date and time');
      return null;
    }
    if (mode === 'ONLINE' && !/^https?:\/\//i.test(meetingLink.trim())) {
      toast.error('Paste the full meeting link, starting with https://');
      return null;
    }
    if (mode === 'IN_PERSON' && !location.trim()) {
      toast.error('Enter where the interview will take place');
      return null;
    }
    return {
      date,
      time,
      durationMinutes,
      mode,
      meetingLink: mode === 'ONLINE' ? meetingLink.trim() : null,
      location: mode === 'IN_PERSON' ? location.trim() : null,
      interviewerIds,
      message: message.trim() || null,
      ...(current ? { notify } : {}),
    };
  };

  const onPreview = async () => {
    const body = payload();
    if (!body) return;
    setBusy('preview');
    try {
      setPreview(await previewInterviewEmail(candidate.id, body));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not build the preview');
    } finally {
      setBusy(null);
    }
  };

  const onSend = async () => {
    const body = payload();
    if (!body) return;
    setBusy('send');
    try {
      const saved = current
        ? await rescheduleInterview(current.id, body)
        : await scheduleInterview(candidate.id, body);
      if (mode === 'IN_PERSON') {
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, location.trim());
        } catch {
          // Remembering the last location is only a convenience.
        }
      }
      if (current && !notify) toast.success('Interview updated (no email sent)');
      else if (saved.emailStatus === 'SENT') toast.success(`Invitation emailed to ${candidate.email}`);
      else if (saved.emailStatus === 'FAILED')
        toast.warning(`Interview saved, but the email failed: ${saved.emailError ?? 'unknown error'}`);
      else toast.info('Interview saved. Email is not set up yet, so nothing was sent.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not schedule the interview');
    } finally {
      setBusy(null);
    }
  };

  const sendLabel = current ? (notify ? 'Save & email update' : 'Save changes') : 'Send invitation';

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {current ? 'Reschedule interview' : 'Schedule interview'} — {candidate.name}
      </DialogTitle>

      <DialogContent>
        {preview ? (
          <EmailPreviewFrame preview={preview} />
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {placeholderEmail ? (
              <Alert severity="error">
                This candidate still has a placeholder email ({candidate.email}). Close this, use{' '}
                <strong>Edit</strong> to enter their real email, then schedule the interview.
              </Alert>
            ) : (
              <Alert severity="info" icon={<Iconify icon="solar:letter-bold" />}>
                The invitation will be emailed to <strong>{candidate.email}</strong>.
              </Alert>
            )}
            {emailOff && (
              <Alert severity="warning">
                Email isn&apos;t set up on the server yet, so the interview will be saved but no
                email will go out. Ask an Admin to fill in the SMTP settings in Backend/.env.
              </Alert>
            )}

            <Box
              sx={{
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
              }}
            >
              <TextField
                type="date"
                label="Date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayPkt() } }}
              />
              <TextField
                type="time"
                label="Time (Pakistan time)"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                label="Duration"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
              >
                {DURATIONS.map((minutes) => (
                  <MenuItem key={minutes} value={minutes}>
                    {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes > 60 ? 's' : ''}`}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Format</Typography>
              <ToggleButtonGroup
                exclusive
                value={mode}
                onChange={(_event, value: InterviewMode | null) => value && setMode(value)}
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="ONLINE" sx={{ gap: 1, px: 2 }}>
                  <Iconify icon="solar:videocamera-record-bold" width={20} /> Online
                </ToggleButton>
                <ToggleButton value="IN_PERSON" sx={{ gap: 1, px: 2 }}>
                  <Iconify icon="mingcute:location-fill" width={20} /> In person
                </ToggleButton>
                <ToggleButton value="PHONE" sx={{ gap: 1, px: 2 }}>
                  <Iconify icon="solar:phone-bold" width={20} /> Phone
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {mode === 'ONLINE' && (
              <TextField
                label="Meeting link"
                placeholder="https://meet.google.com/…  or a Zoom / Teams link"
                value={meetingLink}
                onChange={(event) => setMeetingLink(event.target.value)}
                helperText="Create the meeting in Google Meet, Zoom or Teams first, then paste its link here."
                fullWidth
              />
            )}
            {mode === 'IN_PERSON' && (
              <TextField
                label="Location"
                placeholder="Office address, floor, who to ask for at reception"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                helperText="Remembered for next time."
                multiline
                minRows={2}
                fullWidth
              />
            )}
            {mode === 'PHONE' && (
              <Alert severity="info">
                The candidate will be told to expect a call. Make sure their phone number is on
                their record.
              </Alert>
            )}

            <Autocomplete
              multiple
              options={staff}
              value={selectedStaff}
              onChange={(_event, value: UserDto[]) => setInterviewerIds(value.map((u) => u.id))}
              getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderOption={(props, u) => (
                <li {...props} key={u.id}>
                  <Stack>
                    <Typography variant="body2">{`${u.firstName} ${u.lastName}`}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {[u.designation, u.departmentName].filter(Boolean).join(' · ') || u.role}
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Interviewers (optional)"
                  helperText="They get the calendar invite by email and a notification in the app."
                />
              )}
            />

            <TextField
              label="Note to the candidate (optional)"
              placeholder="e.g. Please bring your degree certificates, or prepare a short presentation."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              multiline
              minRows={3}
              slotProps={{ htmlInput: { maxLength: 3000 } }}
              fullWidth
            />

            {current && (
              <FormControlLabel
                control={<Checkbox checked={notify} onChange={(event) => setNotify(event.target.checked)} />}
                label="Email the candidate and interviewers about this change"
              />
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {preview ? (
          <Button color="inherit" onClick={() => setPreview(null)} startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}>
            Back to edit
          </Button>
        ) : (
          <Button color="inherit" onClick={onClose} disabled={!!busy}>
            Cancel
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {!preview && (
          <Button
            variant="outlined"
            color="inherit"
            loading={busy === 'preview'}
            disabled={placeholderEmail}
            onClick={onPreview}
            startIcon={<Iconify icon="solar:eye-bold" />}
          >
            Preview email
          </Button>
        )}
        <Button
          variant="contained"
          loading={busy === 'send'}
          disabled={placeholderEmail}
          onClick={onSend}
          startIcon={<Iconify icon="solar:forward-bold" />}
        >
          {sendLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
