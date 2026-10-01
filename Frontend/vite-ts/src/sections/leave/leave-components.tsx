import type { LabelColor } from 'src/components/label';
import type { LeaveBalanceDto, LeaveRequestDto, LeaveRequestStatus } from 'src/types/leave';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDate } from 'src/utils/format-time';

import { updateLeaveType, useGetLeaveTypes } from 'src/actions/leave';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const STATUS: Record<LeaveRequestStatus, { label: string; color: LabelColor }> = {
  PENDING_MANAGER: { label: 'Waiting for manager', color: 'warning' },
  PENDING_HR: { label: 'Waiting for HR', color: 'info' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Not approved', color: 'error' },
  CANCELLED: { label: 'Cancelled', color: 'default' },
};

export const LEAVE_STATUS_LABEL = Object.fromEntries(
  Object.entries(STATUS).map(([key, value]) => [key, value.label])
) as Record<LeaveRequestStatus, string>;

export function LeaveStatusLabel({ status }: { status: LeaveRequestStatus }) {
  return (
    <Label variant="soft" color={STATUS[status].color}>
      {STATUS[status].label}
    </Label>
  );
}

/** "28 Sep 2026 – 2 Oct 2026 · 5 days" style summary of a request's dates. */
export function leaveDatesText(row: Pick<LeaveRequestDto, 'startDate' | 'endDate' | 'halfDay' | 'days'>) {
  const range =
    row.startDate === row.endDate ? fDate(row.startDate) : `${fDate(row.startDate)} – ${fDate(row.endDate)}`;
  return `${range} · ${row.halfDay ? 'half day' : `${row.days} day${row.days === 1 ? '' : 's'}`}`;
}

// ----------------------------------------------------------------------

/** One card per leave type: remaining out of the yearly allowance, with used / pending. */
export function LeaveBalanceCards({ balances, year }: { balances: LeaveBalanceDto[]; year: number }) {
  return (
    <Grid container spacing={2}>
      {balances.map((balance) => {
        const limited = balance.annualQuota !== null;
        const usedPercent = limited && balance.annualQuota
          ? Math.min(((balance.used + balance.pending) / balance.annualQuota) * 100, 100)
          : 0;
        return (
          <Grid key={balance.leaveTypeId} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: 2.5, height: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                {balance.leaveTypeName}
              </Typography>
              <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 1 }}>
                <Typography variant="h3">{limited ? balance.remaining : balance.used}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {limited ? `of ${balance.annualQuota} days left` : `days taken in ${year}`}
                </Typography>
              </Stack>
              {limited && (
                <LinearProgress
                  variant="determinate"
                  value={usedPercent}
                  color={usedPercent >= 100 ? 'error' : usedPercent >= 75 ? 'warning' : 'primary'}
                  sx={{ mt: 1.5, height: 6, borderRadius: 1 }}
                />
              )}
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
                {limited ? `${balance.used} taken` : 'No yearly limit'}
                {balance.pending ? ` · ${balance.pending} pending` : ''}
              </Typography>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

// ----------------------------------------------------------------------

/** HR / ADMIN: edit each leave type's yearly allowance and turn types on / off. */
export function LeavePolicyEditor() {
  const { leaveTypes } = useGetLeaveTypes(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const save = async (id: number, payload: { annualQuota?: number | null; isActive?: boolean }) => {
    setSavingId(id);
    try {
      await updateLeaveType(id, payload);
      toast.success('Leave policy updated!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Yearly allowance per leave type (leave blank for no limit). Days are counted Monday to
        Friday.
      </Typography>
      {leaveTypes.map((type) => {
        const draft = drafts[type.id] ?? (type.annualQuota === null ? '' : String(type.annualQuota));
        const changed = draft !== (type.annualQuota === null ? '' : String(type.annualQuota));
        return (
          <Stack
            key={type.id}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            spacing={2}
          >
            <Typography variant="subtitle2" sx={{ minWidth: 140 }}>
              {type.name}
            </Typography>
            <TextField
              size="small"
              type="number"
              label="Days per year"
              value={draft}
              onChange={(event) => setDrafts((prev) => ({ ...prev, [type.id]: event.target.value }))}
              slotProps={{ htmlInput: { min: 0, max: 365, step: 0.5 } }}
              sx={{ width: 150 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={type.isActive}
                  onChange={(event) => save(type.id, { isActive: event.target.checked })}
                />
              }
              label="Active"
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              variant="contained"
              color="inherit"
              disabled={!changed}
              loading={savingId === type.id}
              onClick={() => save(type.id, { annualQuota: draft === '' ? null : Number(draft) })}
            >
              Save
            </Button>
          </Stack>
        );
      })}
    </Stack>
  );
}

// ----------------------------------------------------------------------

type DecisionFormProps = {
  approveLabel: string;
  signatureLabel: string;
  onSubmit: (payload: { approved: boolean; remarks: string; signatureText: string }) => Promise<void>;
};

/** Approve / not approve with remarks and a typed signature — used by the manager and by HR. */
export function LeaveDecisionForm({ approveLabel, signatureLabel, onSubmit }: DecisionFormProps) {
  const [remarks, setRemarks] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [saving, setSaving] = useState<'yes' | 'no' | null>(null);

  const submit = async (approved: boolean) => {
    if (!signatureText.trim()) {
      toast.error('Type your full name to sign');
      return;
    }
    setSaving(approved ? 'yes' : 'no');
    try {
      await onSubmit({ approved, remarks, signatureText });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <TextField
        label="Remarks (optional)"
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label={signatureLabel}
        placeholder="Type your full name to sign"
        value={signatureText}
        onChange={(event) => setSignatureText(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        fullWidth
      />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button
          variant="outlined"
          color="error"
          loading={saving === 'no'}
          disabled={!!saving}
          onClick={() => submit(false)}
        >
          Don&apos;t approve
        </Button>
        <Button
          variant="contained"
          loading={saving === 'yes'}
          disabled={!!saving}
          onClick={() => submit(true)}
        >
          {approveLabel}
        </Button>
      </Stack>
    </>
  );
}
