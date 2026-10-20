import type { AttendanceRegularizationDto } from 'src/types/attendance-regularization';

import { useState } from 'react';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  createAttendanceRegularization,
  updateAttendanceRegularization,
} from 'src/actions/attendance-regularizations';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/** Today as 'YYYY-MM-DD' in the browser's timezone (for the date picker's max). */
function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

type Props = {
  // Editing an existing form (until the HOD recommends it) instead of submitting a new one.
  current?: AttendanceRegularizationDto;
};

/**
 * The employee's part of the HRD "Regularization of Attendance Recorded in HRD" form. Code, name,
 * designation and department come from the logged-in user (or the form, when editing); the form
 * then goes to their manager (head of department) to recommend, and on to HR.
 */
export function AttendanceRegularizationCreateView({ current }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const [attendanceDate, setAttendanceDate] = useState(current?.attendanceDate ?? todayLocal());
  // The API may return 'HH:MM:SS' — the time input wants 'HH:MM'.
  const [timeArrival, setTimeArrival] = useState(current?.timeArrival?.slice(0, 5) ?? '');
  const [timeDeparture, setTimeDeparture] = useState(current?.timeDeparture?.slice(0, 5) ?? '');
  const [reason, setReason] = useState(current?.reason ?? '');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!attendanceDate) {
      toast.error('Pick the date to regularize');
      return;
    }
    if (!timeArrival && !timeDeparture) {
      toast.error('Enter the arrival time, the departure time, or both');
      return;
    }
    if (!reason.trim()) {
      toast.error('Give the reason for the late arrival / missed punch');
      return;
    }
    setSubmitting(true);
    try {
      if (current) {
        // '' clears a time that was removed.
        await updateAttendanceRegularization(current.id, {
          attendanceDate,
          reason,
          timeArrival,
          timeDeparture,
        });
        toast.success(
          current.hodId ? 'Form updated — your head of department has been told' : 'Form updated — HR has been told'
        );
        router.push(paths.dashboard.attendanceRegularizations.details(current.id));
        return;
      }
      const created = await createAttendanceRegularization({
        attendanceDate,
        reason,
        ...(timeArrival ? { timeArrival } : {}),
        ...(timeDeparture ? { timeDeparture } : {}),
      });
      toast.success(
        created.hodId ? 'Sent to your head of department!' : 'Sent to HR!'
      );
      router.push(paths.dashboard.attendanceRegularizations.details(created.id));
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
        heading={current ? 'Edit regularization of attendance' : 'Regularization of attendance'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Attendance Regularization', href: paths.dashboard.attendanceRegularizations.root },
          ...(current
            ? [
                {
                  name: `#${current.id}`,
                  href: paths.dashboard.attendanceRegularizations.details(current.id),
                },
                { name: 'Edit' },
              ]
            : [{ name: 'New' }]),
        ]}
        sx={{ mb: 3 }}
      />

      {!current && !user?.managerId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have no manager on record, so this form will go straight to HR.
        </Alert>
      )}

      <Stack spacing={3}>
        <HrFormSection title="Employee">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Employee code"
                value={(current ? current.employeeCode : user?.employeeCode) ?? '—'}
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Employee name"
                value={
                  current ? current.employeeName : user ? `${user.firstName} ${user.lastName}` : ''
                }
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Designation"
                value={(current ? current.employeeDesignation : user?.designation) ?? '—'}
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Department"
                value={(current ? current.employeeDepartment : user?.departmentName) ?? '—'}
                fullWidth
                disabled
              />
            </Grid>
          </Grid>
        </HrFormSection>

        <HrFormSection title="Attendance to regularize">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                type="date"
                label="Date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayLocal() } }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                type="time"
                label="Time arrival"
                value={timeArrival}
                onChange={(event) => setTimeArrival(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                type="time"
                label="Time departure"
                value={timeDeparture}
                onChange={(event) => setTimeDeparture(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Grid>
          </Grid>
          <TextField
            label="Reasons for late arrival / not punching the thumb / hand / card"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            multiline
            minRows={4}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            fullWidth
          />
        </HrFormSection>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button
            component={RouterLink}
            href={
              current
                ? paths.dashboard.attendanceRegularizations.details(current.id)
                : paths.dashboard.attendanceRegularizations.root
            }
            variant="outlined"
          >
            Cancel
          </Button>
          <Button variant="contained" loading={submitting} onClick={onSubmit}>
            {current ? 'Save changes' : 'Submit'}
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
