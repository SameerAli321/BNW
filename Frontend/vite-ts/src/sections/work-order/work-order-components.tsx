import type { LabelColor } from 'src/components/label';
import type { WorkOrderDto, WorkOrderType, WorkOrderStatus } from 'src/actions/work-orders';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';

import { fPkr, useGetWorkOrderSettings, updateWorkOrderSettings } from 'src/actions/work-orders';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** Status in words — the final step reads differently per type ("With Payroll" / "Issued"). */
export function workOrderStatusText(status: WorkOrderStatus, type?: WorkOrderType): string {
  switch (status) {
    case 'PENDING_MANAGER':
      return 'With manager';
    case 'PENDING_CEO':
      return 'With CEO';
    case 'PENDING_PROCESSING':
      return type === 'EQUIPMENT' ? 'With HR' : type === 'REIMBURSEMENT' ? 'With Payroll' : 'Final step';
    case 'COMPLETED':
      return type === 'EQUIPMENT' ? 'Issued' : type === 'REIMBURSEMENT' ? 'Paid' : 'Completed';
    case 'REJECTED':
      return 'Not approved';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

const STATUS_COLOR: Record<WorkOrderStatus, LabelColor> = {
  PENDING_MANAGER: 'warning',
  PENDING_CEO: 'warning',
  PENDING_PROCESSING: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error',
  CANCELLED: 'error',
};

export function WorkOrderStatusLabel({ status, type }: { status: WorkOrderStatus; type?: WorkOrderType }) {
  return (
    <Label variant="soft" color={STATUS_COLOR[status]}>
      {workOrderStatusText(status, type)}
    </Label>
  );
}

export function WorkOrderTypeLabel({ type }: { type: WorkOrderType }) {
  return (
    <Label
      variant="soft"
      color={type === 'REIMBURSEMENT' ? 'primary' : 'secondary'}
      startIcon={
        <Iconify icon={type === 'REIMBURSEMENT' ? 'solar:wad-of-money-bold' : 'solar:monitor-bold'} />
      }
    >
      {type === 'REIMBURSEMENT' ? 'Reimbursement' : 'Equipment'}
    </Label>
  );
}

// ----------------------------------------------------------------------

type Step = { label: string; state: 'done' | 'rejected' | 'current' | 'todo'; who?: string | null };

/** The approval chain for this work order, as a row of steps. */
export function WorkOrderSteps({ order }: { order: WorkOrderDto }) {
  const s = order.status;
  const stepState = (approved: boolean | null, isCurrent: boolean): Step['state'] =>
    approved === true ? 'done' : approved === false ? 'rejected' : isCurrent ? 'current' : 'todo';

  const steps: Step[] = [{ label: 'Submitted', state: 'done', who: order.employeeName }];
  if (order.managerId) {
    steps.push({
      label: 'Line manager',
      state: stepState(order.managerApproved, s === 'PENDING_MANAGER'),
      who: order.managerName,
    });
  }
  if (order.ceoRequired) {
    steps.push({ label: 'CEO', state: stepState(order.ceoApproved, s === 'PENDING_CEO'), who: order.ceoName });
  }
  steps.push({
    label: order.type === 'REIMBURSEMENT' ? 'Payroll — paid' : 'HR — issued',
    state: stepState(order.processorApproved, s === 'PENDING_PROCESSING'),
    who: order.processorName,
  });
  if (s === 'CANCELLED') steps.forEach((step) => step.state === 'current' && (step.state = 'todo'));

  const color = (state: Step['state']) =>
    state === 'done' ? 'success.main' : state === 'rejected' ? 'error.main' : state === 'current' ? 'warning.main' : 'text.disabled';
  const icon = (state: Step['state']) =>
    state === 'done'
      ? 'solar:check-circle-bold'
      : state === 'rejected'
        ? 'solar:close-circle-bold'
        : state === 'current'
          ? 'solar:clock-circle-bold'
          : 'eva:radio-button-off-fill';

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} sx={{ gap: 1 }}>
      {steps.map((step, index) => (
        <Stack key={step.label} direction="row" alignItems="center" sx={{ gap: 1, flex: { sm: 1 } }}>
          <Iconify icon={icon(step.state)} width={24} sx={{ color: color(step.state), flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {step.label}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
              {step.state === 'current' ? 'Waiting' : step.who || (step.state === 'todo' ? 'Not yet' : '')}
            </Typography>
          </Box>
          {index < steps.length - 1 && (
            <Box
              sx={{
                flexGrow: 1,
                height: 2,
                minWidth: 16,
                mx: 1,
                display: { xs: 'none', sm: 'block' },
                bgcolor: step.state === 'done' ? 'success.light' : 'divider',
              }}
            />
          )}
        </Stack>
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------

/** HR / Admin: change the amount above which the CEO must also approve. */
export function WorkOrderSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useGetWorkOrderSettings();
  const [limit, setLimit] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const value = limit === '' ? String(settings?.ceoApprovalLimit ?? '') : limit;

  const onSave = async () => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter the limit in rupees');
      return;
    }
    setSaving(true);
    try {
      await updateWorkOrderSettings(amount);
      toast.success(`Saved — amounts over ${fPkr(amount)} now need the CEO`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Work order settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            type="number"
            label="CEO approval needed above"
            value={value}
            onChange={(event) => setLimit(event.target.value)}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
              htmlInput: { min: 0, step: 1000 },
            }}
            helperText="Reimbursements or equipment costing more than this go to the CEO after the line manager. Applies to new requests."
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" loading={saving} onClick={onSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
