import type { IconifyName } from 'src/components/iconify';
import type { SalarySlipDto } from 'src/actions/salary-slips';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { fDateTime } from 'src/utils/format-time';

import {
  fSalary,
  sendSalarySlip,
  EMAIL_STATUS_LABEL,
  fetchSalarySlipPdf,
  printSalarySlipPdf,
  downloadSalarySlipPdf,
} from 'src/actions/salary-slips';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const STATUS_COLOR = { NOT_SENT: 'default', SENT: 'success', FAILED: 'error' } as const;

/** Email status pill; hovering shows who it went to / when / why it failed. */
export function SalarySlipEmailStatus({ slip }: { slip: SalarySlipDto }) {
  const detail =
    slip.emailStatus === 'SENT'
      ? `Sent to ${slip.emailedTo ?? 'employee'}${slip.emailSentAt ? ` on ${fDateTime(slip.emailSentAt)}` : ''}`
      : slip.emailStatus === 'FAILED'
        ? `${slip.emailError ?? 'The email could not be sent'}${slip.lastEmailAttemptAt ? ` (last tried ${fDateTime(slip.lastEmailAttemptAt)})` : ''}`
        : 'Not emailed to the employee yet';
  return (
    <Tooltip title={detail} arrow>
      <span>
        <Label
          variant="soft"
          color={STATUS_COLOR[slip.emailStatus]}
          startIcon={
            slip.emailStatus === 'FAILED' ? (
              <Iconify icon="solar:danger-triangle-bold" />
            ) : undefined
          }
        >
          {EMAIL_STATUS_LABEL[slip.emailStatus]}
        </Label>
      </span>
    </Tooltip>
  );
}

// ----------------------------------------------------------------------

type PendingAction = 'download' | 'print' | 'send' | null;

/** Download / print / send with per-action loading state and toasts. */
export function useSalarySlipActions(onSent?: (slip: SalarySlipDto) => void) {
  const [pending, setPending] = useState<{ id: number; action: PendingAction } | null>(null);

  const run = useCallback(
    async (slip: SalarySlipDto, action: Exclude<PendingAction, null>) => {
      setPending({ id: slip.id, action });
      try {
        if (action === 'download') await downloadSalarySlipPdf(slip);
        if (action === 'print') await printSalarySlipPdf(slip.id);
        if (action === 'send') {
          const updated = await sendSalarySlip(slip.id);
          if (updated.emailStatus === 'SENT') {
            toast.success(`Salary slip emailed to ${updated.emailedTo}`);
          } else {
            toast.error(
              `Email failed: ${updated.emailError ?? 'unknown error'}. You can resend it.`
            );
          }
          onSent?.(updated);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something went wrong');
      } finally {
        setPending(null);
      }
    },
    [onSent]
  );

  const isPending = (slip: SalarySlipDto, action: Exclude<PendingAction, null>) =>
    pending?.id === slip.id && pending.action === action;

  return { run, isPending, busy: pending !== null };
}

// ----------------------------------------------------------------------

type ActionButtonsProps = {
  slip: SalarySlipDto;
  canSend: boolean;
  onView?: () => void;
  actions: ReturnType<typeof useSalarySlipActions>;
};

/** Icon buttons for a history row: View, Download, Print, Send / Resend. */
export function SalarySlipActionButtons({ slip, canSend, onView, actions }: ActionButtonsProps) {
  const [confirmResend, setConfirmResend] = useState(false);
  const sendLabel = slip.emailStatus === 'NOT_SENT' ? 'Send to employee' : 'Resend';
  const sending = actions.isPending(slip, 'send');

  const icon = (action: 'download' | 'print', name: IconifyName) =>
    actions.isPending(slip, action) ? <CircularProgress size={18} /> : <Iconify icon={name} />;

  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ whiteSpace: 'nowrap' }}>
      {onView && (
        <Tooltip title="View">
          <IconButton onClick={onView}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Download PDF">
        <span>
          <IconButton disabled={actions.busy} onClick={() => actions.run(slip, 'download')}>
            {icon('download', 'solar:download-bold')}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Print">
        <span>
          <IconButton disabled={actions.busy} onClick={() => actions.run(slip, 'print')}>
            {icon('print', 'solar:printer-minimalistic-bold')}
          </IconButton>
        </span>
      </Tooltip>
      {canSend && slip.isCurrent && (
        <Tooltip title={sendLabel}>
          <span>
            <IconButton
              color={slip.emailStatus === 'FAILED' ? 'error' : 'primary'}
              disabled={actions.busy}
              onClick={() =>
                slip.emailStatus === 'SENT' ? setConfirmResend(true) : actions.run(slip, 'send')
              }
            >
              {sending ? (
                <CircularProgress size={18} />
              ) : (
                <Iconify
                  icon={slip.emailStatus === 'NOT_SENT' ? 'custom:send-fill' : 'solar:restart-bold'}
                />
              )}
            </IconButton>
          </span>
        </Tooltip>
      )}

      <ConfirmDialog
        open={confirmResend}
        onClose={() => setConfirmResend(false)}
        title="Resend salary slip?"
        content={`This slip was already emailed to ${slip.emailedTo ?? 'the employee'}${slip.emailSentAt ? ` on ${fDateTime(slip.emailSentAt)}` : ''}. Send it again?`}
        action={
          <Button
            variant="contained"
            onClick={() => {
              setConfirmResend(false);
              actions.run(slip, 'send');
            }}
          >
            Resend
          </Button>
        }
      />
    </Stack>
  );
}

// ----------------------------------------------------------------------

/** The PDF itself, fetched with the auth header and shown in an iframe. */
export function SalarySlipPdfFrame({ slipId, height = 720 }: { slipId: number; height?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(null);
    fetchSalarySlipPdf(slipId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [slipId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!url) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box
      component="iframe"
      title="Salary slip PDF"
      src={`${url}#toolbar=1&navpanes=0`}
      sx={{ width: 1, height, border: 0, borderRadius: 1, bgcolor: 'background.neutral' }}
    />
  );
}

// ----------------------------------------------------------------------

type PreviewDialogProps = {
  slip: SalarySlipDto;
  canSend: boolean;
  onClose: () => void;
};

/** "View": the PDF plus the totals and Download / Print / Send actions. */
export function SalarySlipPreviewDialog({ slip: initial, canSend, onClose }: PreviewDialogProps) {
  const [slip, setSlip] = useState(initial);
  const actions = useSalarySlipActions(setSlip);
  useEffect(() => setSlip(initial), [initial]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <span>
            {slip.employeeName} — {slip.salaryMonthLabel}
          </span>
          <SalarySlipEmailStatus slip={slip} />
          {!slip.isCurrent && (
            <Label color="warning" variant="soft">
              Replaced by a newer revision
            </Label>
          )}
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {slip.reference} · Gross {fSalary(slip.grossSalary)} · Deductions{' '}
          {fSalary(slip.totalDeductions)} · <strong>Net {fSalary(slip.netSalary)}</strong>
        </Typography>
      </DialogTitle>
      <DialogContent>
        {slip.emailStatus === 'FAILED' && canSend && (
          <Alert severity="error" sx={{ mb: 2 }}>
            The last email failed: {slip.emailError ?? 'unknown error'}
          </Alert>
        )}
        <SalarySlipPdfFrame slipId={slip.id} height={640} />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
          loading={actions.isPending(slip, 'print')}
          disabled={actions.busy}
          onClick={() => actions.run(slip, 'print')}
        >
          Print
        </Button>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:download-bold" />}
          loading={actions.isPending(slip, 'download')}
          disabled={actions.busy}
          onClick={() => actions.run(slip, 'download')}
        >
          Download
        </Button>
        {canSend && slip.isCurrent && (
          <Button
            variant="contained"
            color={slip.emailStatus === 'FAILED' ? 'error' : 'primary'}
            startIcon={
              <Iconify
                icon={slip.emailStatus === 'NOT_SENT' ? 'custom:send-fill' : 'solar:restart-bold'}
              />
            }
            loading={actions.isPending(slip, 'send')}
            disabled={actions.busy}
            onClick={() => actions.run(slip, 'send')}
          >
            {slip.emailStatus === 'NOT_SENT' ? 'Send salary slip' : 'Resend'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
