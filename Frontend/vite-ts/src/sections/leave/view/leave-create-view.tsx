import type { LeaveRequestDto } from 'src/types/leave';

import { useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  useGetLeaveTypes,
  createLeaveRequest,
  updateLeaveRequest,
  useGetLeaveBalance,
} from 'src/actions/leave';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const isWeekend = (day: Date) => day.getUTCDay() === 0 || day.getUTCDay() === 6;

/**
 * Days of leave between two 'YYYY-MM-DD' dates, inclusive — mirrors the backend's countLeaveDays.
 * "Sandwich" rule: a weekend between two leave days counts (Fri → Mon = 4), weekend days at the
 * edges don't (Sat → Mon = 1). The server also adds a weekend that sits between this request and
 * another leave, so the saved request is the final word.
 */
function countLeaveDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const first = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);
  while (first <= last && isWeekend(first)) first.setUTCDate(first.getUTCDate() + 1);
  while (last >= first && isWeekend(last)) last.setUTCDate(last.getUTCDate() - 1);
  if (first > last) return 0;
  return Math.round((last.getTime() - first.getTime()) / DAY_MS) + 1;
}

type Props = {
  // Editing an existing request (nobody has acted on it yet) instead of applying.
  current?: LeaveRequestDto;
};

/**
 * Leave / holiday application — also the edit form while the request is still untouched. Shows
 * the remaining balance for the chosen type and a live day count; the backend re-checks the
 * balance, overlaps, weekends and leave next to other leave.
 */
export function LeaveCreateView({ current }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { leaveTypes } = useGetLeaveTypes();
  const isEdit = !!current;

  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>(current?.leaveTypeId ?? '');
  const [startDate, setStartDate] = useState(current?.startDate ?? '');
  const [endDate, setEndDate] = useState(current?.endDate ?? '');
  const [halfDay, setHalfDay] = useState(current?.halfDay ?? false);
  const [reason, setReason] = useState(current?.reason ?? '');
  const [contactDuringLeave, setContactDuringLeave] = useState(current?.contactDuringLeave ?? '');
  const [submitting, setSubmitting] = useState(false);

  const year = startDate ? Number(startDate.slice(0, 4)) : new Date().getFullYear();
  const { balances } = useGetLeaveBalance(current?.employeeId ?? user?.id, year);
  const balance = balances.find((b) => b.leaveTypeId === leaveTypeId);
  // When editing, this request's own days are already counted as pending — give them back.
  const ownDays =
    current &&
    current.leaveTypeId === leaveTypeId &&
    current.startDate.slice(0, 4) === String(year)
      ? current.days
      : 0;
  const remaining = balance && balance.remaining !== null ? balance.remaining + ownDays : null;

  const singleDay = !!startDate && startDate === endDate;
  const leaveDays = useMemo(() => countLeaveDays(startDate, endDate), [startDate, endDate]);
  const days = singleDay && halfDay ? 0.5 : leaveDays;
  const overBalance = remaining !== null && days > remaining;

  const onSubmit = async () => {
    if (leaveTypeId === '') {
      toast.error('Choose the type of leave');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Pick the first and last day of your leave');
      return;
    }
    if (!reason.trim()) {
      toast.error('Give a reason for the leave');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        leaveTypeId,
        startDate,
        endDate,
        halfDay: singleDay && halfDay,
        reason,
      };
      const saved = current
        ? await updateLeaveRequest(current.id, { ...payload, contactDuringLeave })
        : await createLeaveRequest({
            ...payload,
            ...(contactDuringLeave.trim() ? { contactDuringLeave } : {}),
          });
      // The server may add a weekend that sits between this and another leave.
      const savedDays = `${saved.days} day${saved.days === 1 ? '' : 's'}`;
      const weekendNote =
        saved.days > days ? ' (includes the weekend next to your other leave)' : '';
      toast.success(
        isEdit
          ? `Leave request updated — ${savedDays}${weekendNote}`
          : `${saved.managerId ? 'Sent to your manager for approval' : 'Sent to HR for approval'} — ${savedDays}${weekendNote}`
      );
      router.push(paths.dashboard.leaveRequests.details(saved.id));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Submit failed!');
    } finally {
      setSubmitting(false);
    }
  };

  const backHref = current
    ? paths.dashboard.leaveRequests.details(current.id)
    : paths.dashboard.leaveRequests.root;

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading={isEdit ? 'Edit leave request' : 'Apply for leave'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Leave & Holidays', href: paths.dashboard.leaveRequests.root },
          ...(current
            ? [
                { name: `#${current.id}`, href: paths.dashboard.leaveRequests.details(current.id) },
                { name: 'Edit' },
              ]
            : [{ name: 'Apply' }]),
        ]}
        sx={{ mb: 3 }}
      />

      {current ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {current.employeeId === user?.id
            ? 'You can change this request until it is reviewed.'
            : `You are editing ${current.employeeName}'s request.`}{' '}
          {current.status === 'PENDING_MANAGER'
            ? `${current.managerName ?? 'The line manager'} will be told about the change.`
            : 'HR will be told about the change.'}
        </Alert>
      ) : (
        !user?.managerId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You have no manager on record, so this will go straight to HR for approval.
          </Alert>
        )
      )}

      <Stack spacing={3}>
        <HrFormSection title="Leave details">
          <TextField
            select
            label="Type of leave"
            value={leaveTypeId}
            onChange={(event) => setLeaveTypeId(Number(event.target.value))}
            fullWidth
            helperText={
              balance
                ? remaining === null
                  ? 'No yearly limit'
                  : `${remaining} of ${balance.annualQuota} day(s) left in ${year}` +
                    (balance.pending - ownDays > 0 ? ` (${balance.pending - ownDays} pending)` : '')
                : ' '
            }
          >
            {leaveTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </TextField>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="date"
                label="From"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (!endDate || endDate < event.target.value) setEndDate(event.target.value);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="date"
                label="To"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: startDate || undefined },
                }}
                fullWidth
              />
            </Grid>
          </Grid>

          {singleDay && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={halfDay}
                  onChange={(event) => setHalfDay(event.target.checked)}
                />
              }
              label="Half day"
            />
          )}

          {startDate && endDate && (
            <Alert severity={leaveDays === 0 || overBalance ? 'warning' : 'success'}>
              {leaveDays === 0
                ? 'Those dates are all weekend days — no leave is needed.'
                : `${days} day(s) of leave.` +
                  (overBalance ? ` That's more than your ${remaining} remaining day(s).` : '')}
            </Alert>
          )}
          <Alert severity="info" variant="outlined">
            Weekends between leave days count as leave (Fri + Mon = 4 days). That includes leave
            that starts on a Monday right after other leave ending on Friday (or ends on a Friday
            right before other leave) — the saved request shows the final count.
          </Alert>

          <TextField
            label="Reason for leave"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            fullWidth
          />
          <TextField
            label="Contact during leave (optional)"
            placeholder="Phone number or email"
            value={contactDuringLeave}
            onChange={(event) => setContactDuringLeave(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            fullWidth
          />
        </HrFormSection>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button component={RouterLink} href={backHref} variant="outlined">
            Cancel
          </Button>
          <Button
            variant="contained"
            loading={submitting}
            disabled={leaveDays === 0 && !!startDate && !!endDate}
            onClick={onSubmit}
          >
            {isEdit ? 'Save changes' : 'Submit'}
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
