import type { CandidateDto } from 'src/types/candidate';
import type { InterviewDto, InterviewStatus } from 'src/actions/interviews';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import {
  cancelInterview,
  setInterviewOutcome,
  INTERVIEW_MODE_LABEL,
  resendInterviewInvite,
  useGetCandidateInterviews,
} from 'src/actions/interviews';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { InterviewScheduleDialog } from './interview-schedule-dialog';

// ----------------------------------------------------------------------

const STATUS_LABEL: Record<InterviewStatus, { label: string; color: 'info' | 'success' | 'warning' | 'error' }> = {
  SCHEDULED: { label: 'Scheduled', color: 'info' },
  COMPLETED: { label: 'Completed', color: 'success' },
  NO_SHOW: { label: 'No-show', color: 'warning' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
};

/** "Tue, 6 Oct 2026 · 10:30 AM PKT" from the interview's Pakistan-time parts. */
export function interviewWhen(interview: Pick<InterviewDto, 'date' | 'time'>): string {
  const [y, m, d] = interview.date.split('-').map(Number);
  const [hh, mm] = interview.time.split(':').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const hour12 = ((hh + 11) % 12) + 1;
  return `${day} · ${hour12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'} PKT`;
}

function EmailStatusLabel({ interview }: { interview: InterviewDto }) {
  if (interview.emailStatus === 'SENT') {
    return (
      <Tooltip title={interview.emailSentAt ? `Sent ${fDateTime(interview.emailSentAt)}` : ''}>
        <Label variant="soft" color="success" startIcon={<Iconify icon="eva:checkmark-fill" />}>
          Email sent
        </Label>
      </Tooltip>
    );
  }
  if (interview.emailStatus === 'FAILED') {
    return (
      <Tooltip title={interview.emailError ?? ''}>
        <Label variant="soft" color="error" startIcon={<Iconify icon="solar:danger-bold" />}>
          Email failed
        </Label>
      </Tooltip>
    );
  }
  if (interview.emailStatus === 'NOT_CONFIGURED') {
    return (
      <Tooltip title="Email isn't set up on the server, so nothing was sent. Use Resend once it is.">
        <Label variant="soft" color="default">
          Email not sent
        </Label>
      </Tooltip>
    );
  }
  return null;
}

// ----------------------------------------------------------------------

function CancelInterviewDialog({ interview, onClose }: { interview: InterviewDto; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    setBusy(true);
    try {
      const saved = await cancelInterview(interview.id, { reason: reason.trim() || undefined, notify });
      toast.success(
        notify && saved.emailStatus === 'SENT'
          ? 'Interview cancelled and the candidate was emailed'
          : 'Interview cancelled'
      );
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Cancel this interview?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {interview.candidateName} — {interviewWhen(interview)}
          </Typography>
          <TextField
            label="Reason (optional, included in the email)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <FormControlLabel
            control={<Checkbox checked={notify} onChange={(event) => setNotify(event.target.checked)} />}
            label="Email the candidate and interviewers"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          Keep it
        </Button>
        <Button variant="contained" color="error" loading={busy} onClick={onConfirm}>
          Cancel interview
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function InterviewCard({ interview, candidate }: { interview: InterviewDto; candidate: CandidateDto }) {
  const [dialog, setDialog] = useState<'reschedule' | 'cancel' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const status = STATUS_LABEL[interview.status];
  const isScheduled = interview.status === 'SCHEDULED';
  const isPast = new Date(interview.scheduledAt).getTime() < Date.now();

  const run = async (key: string, action: () => Promise<InterviewDto>, success: (saved: InterviewDto) => string) => {
    setBusy(key);
    try {
      const saved = await action();
      toast.success(success(saved));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong!');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5 }, opacity: interview.status === 'CANCELLED' ? 0.7 : 1 }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ flexWrap: 'wrap', gap: 1.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1">{interviewWhen(interview)}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {INTERVIEW_MODE_LABEL[interview.mode]} · {interview.durationMinutes} min
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <EmailStatusLabel interview={interview} />
          <Label variant="soft" color={status.color}>
            {status.label}
          </Label>
        </Stack>
      </Stack>

      <Stack spacing={0.75} sx={{ mt: 1.5, typography: 'body2' }}>
        {interview.meetingLink && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="eva:link-2-fill" width={18} sx={{ color: 'text.disabled', flexShrink: 0 }} />
            <Link href={interview.meetingLink} target="_blank" rel="noopener" noWrap>
              {interview.meetingLink}
            </Link>
          </Stack>
        )}
        {interview.location && (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Iconify icon="mingcute:location-fill" width={18} sx={{ color: 'text.disabled', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'pre-wrap' }}>{interview.location}</span>
          </Stack>
        )}
        {!!interview.interviewers.length && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="solar:users-group-rounded-bold" width={18} sx={{ color: 'text.disabled', flexShrink: 0 }} />
            <span>{interview.interviewers.map((i) => i.name).join(', ')}</span>
          </Stack>
        )}
        {interview.message && (
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', pl: 3.25 }}>
            “{interview.message}”
          </Typography>
        )}
        {interview.cancelReason && (
          <Typography variant="body2" sx={{ color: 'error.main', pl: 3.25 }}>
            Cancelled: {interview.cancelReason}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: 'text.disabled', pl: 3.25 }}>
          Scheduled by {interview.createdByName ?? '—'} on {fDateTime(interview.createdAt)}
        </Typography>
      </Stack>

      {isScheduled && (
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 1, mt: 2 }}>
          {!isPast && (
            <Button size="small" variant="outlined" color="inherit" onClick={() => setDialog('reschedule')}
              startIcon={<Iconify icon="solar:calendar-date-bold" width={16} />}>
              Reschedule
            </Button>
          )}
          {!isPast && (
            <Button size="small" variant="outlined" color="inherit" loading={busy === 'resend'}
              startIcon={<Iconify icon="solar:restart-bold" width={16} />}
              onClick={() =>
                run('resend', () => resendInterviewInvite(interview.id), (saved) =>
                  saved.emailStatus === 'SENT' ? 'Invitation re-sent' : `Not sent: ${saved.emailError ?? 'email is not set up'}`
                )
              }>
              Resend email
            </Button>
          )}
          {isPast && (
            <>
              <Button size="small" variant="outlined" color="success" loading={busy === 'done'}
                startIcon={<Iconify icon="solar:check-circle-bold" width={16} />}
                onClick={() => run('done', () => setInterviewOutcome(interview.id, 'COMPLETED'), () => 'Marked as completed')}>
                Mark completed
              </Button>
              <Button size="small" variant="outlined" color="warning" loading={busy === 'noshow'}
                onClick={() => run('noshow', () => setInterviewOutcome(interview.id, 'NO_SHOW'), () => 'Marked as no-show')}>
                No-show
              </Button>
            </>
          )}
          <Button size="small" color="error" onClick={() => setDialog('cancel')}
            startIcon={<Iconify icon="solar:close-circle-bold" width={16} />}>
            Cancel
          </Button>
        </Stack>
      )}

      {dialog === 'reschedule' && (
        <InterviewScheduleDialog open onClose={() => setDialog(null)} candidate={candidate} current={interview} />
      )}
      {dialog === 'cancel' && <CancelInterviewDialog interview={interview} onClose={() => setDialog(null)} />}
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  candidate: CandidateDto;
};

/** A candidate's interviews — upcoming and past — with reschedule / cancel / resend / outcome. */
export function CandidateInterviewsDialog({ open, onClose, candidate }: Props) {
  const { interviews, interviewsLoading } = useGetCandidateInterviews(candidate.id);
  const [scheduling, setScheduling] = useState(false);
  const canSchedule = candidate.status === 'SHORTLISTED';

  const smDown = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={smDown}>
      <DialogTitle>
        Interviews — {candidate.name}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {candidate.email}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pb: 1 }}>
          {!interviewsLoading && !interviews.length && (
            <EmptyContent
              title="No interviews yet"
              description={canSchedule ? 'Schedule one and the candidate will be emailed an invitation.' : 'Shortlist the candidate to schedule an interview.'}
              sx={{ py: 5 }}
            />
          )}
          {interviews.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} candidate={candidate} />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
        {canSchedule && (
          <Button variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setScheduling(true)}>
            Schedule interview
          </Button>
        )}
      </DialogActions>
      {scheduling && <InterviewScheduleDialog open onClose={() => setScheduling(false)} candidate={candidate} />}
    </Dialog>
  );
}
