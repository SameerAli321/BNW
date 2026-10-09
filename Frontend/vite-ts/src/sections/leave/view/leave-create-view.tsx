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
import { useGetLeaveTypes, createLeaveRequest, useGetLeaveBalance } from 'src/actions/leave';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/** Mon–Fri days between two 'YYYY-MM-DD' dates, inclusive — mirrors the backend's count. */
function countWorkingDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  let days = 0;
  while (current <= end) {
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

/**
 * Leave / holiday application. Shows the remaining balance for the chosen type and a live
 * working-day count; the backend re-checks the balance, overlaps and weekends.
 */
export function LeaveCreateView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { leaveTypes } = useGetLeaveTypes();

  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [contactDuringLeave, setContactDuringLeave] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const year = startDate ? Number(startDate.slice(0, 4)) : new Date().getFullYear();
  const { balances } = useGetLeaveBalance(user?.id, year);
  const balance = balances.find((b) => b.leaveTypeId === leaveTypeId);

  const singleDay = !!startDate && startDate === endDate;
  const workingDays = useMemo(() => countWorkingDays(startDate, endDate), [startDate, endDate]);
  const days = singleDay && halfDay ? 0.5 : workingDays;
  const overBalance = !!balance && balance.remaining !== null && days > balance.remaining;

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
      const created = await createLeaveRequest({
        leaveTypeId,
        startDate,
        endDate,
        halfDay: singleDay && halfDay,
        reason,
        ...(contactDuringLeave.trim() ? { contactDuringLeave } : {}),
      });
      toast.success(
        created.managerId ? 'Sent to your manager for approval!' : 'Sent to HR for approval!'
      );
      router.push(paths.dashboard.leaveRequests.details(created.id));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Submit failed!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading="Apply for leave"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Leave & Holidays', href: paths.dashboard.leaveRequests.root },
          { name: 'Apply' },
        ]}
        sx={{ mb: 3 }}
      />

      {!user?.managerId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have no manager on record, so this will go straight to HR for approval.
        </Alert>
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
                ? balance.remaining === null
                  ? 'No yearly limit'
                  : `${balance.remaining} of ${balance.annualQuota} day(s) left in ${year}` +
                    (balance.pending ? ` (${balance.pending} pending)` : '')
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
            <Alert severity={workingDays === 0 || overBalance ? 'warning' : 'success'}>
              {workingDays === 0
                ? 'Those dates are all weekend days — no leave is needed.'
                : `${days} working day(s) of leave (Monday–Friday).` +
                  (overBalance
                    ? ` That's more than your ${balance?.remaining} remaining day(s).`
                    : '')}
            </Alert>
          )}

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
          <Button
            component={RouterLink}
            href={paths.dashboard.leaveRequests.root}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            loading={submitting}
            disabled={workingDays === 0 && !!startDate && !!endDate}
            onClick={onSubmit}
          >
            Submit
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
