import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetAttendanceRegularization } from 'src/actions/attendance-regularizations';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { AttendanceRegularizationCreateView } from './attendance-regularization-create-view';

// ----------------------------------------------------------------------

/**
 * Edit an attendance regularization — the form, pre-filled. Only until the HOD recommends it
 * (`canEdit` from the backend, which also enforces it).
 */
export function AttendanceRegularizationEditView() {
  const { id = '' } = useParams();
  const { form, formLoading, formError } = useGetAttendanceRegularization(id);

  if (formLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (formError || !form || !form.canEdit) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title={form ? 'This form can no longer be edited' : 'Unable to load this form'}
          description={
            form
              ? 'Your head of department or HR has already acted on it.'
              : "Either it doesn't exist, or you don't have permission to view it."
          }
          action={
            <Button
              component={RouterLink}
              href={
                form
                  ? paths.dashboard.attendanceRegularizations.details(form.id)
                  : paths.dashboard.attendanceRegularizations.root
              }
              variant="outlined"
              sx={{ mt: 3 }}
            >
              Back
            </Button>
          }
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  return <AttendanceRegularizationCreateView key={form.updatedAt} current={form} />;
}
