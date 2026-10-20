import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useGetLeaveRequest } from 'src/actions/leave';
import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { LeaveCreateView } from './leave-create-view';

// ----------------------------------------------------------------------

/**
 * Edit a leave request — the apply form, pre-filled. Only while nobody has acted on it yet
 * (`canEdit` from the backend, which also enforces it).
 */
export function LeaveEditView() {
  const { id = '' } = useParams();
  const { request, requestLoading, requestError } = useGetLeaveRequest(id);

  if (requestLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (requestError || !request || !request.canEdit) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title={request ? 'This leave request can no longer be edited' : 'Unable to load this leave request'}
          description={
            request
              ? 'Your manager or HR has already acted on it.'
              : "Either it doesn't exist, or you don't have permission to view it."
          }
          action={
            <Button
              component={RouterLink}
              href={
                request
                  ? paths.dashboard.leaveRequests.details(request.id)
                  : paths.dashboard.leaveRequests.root
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

  return <LeaveCreateView key={request.updatedAt} current={request} />;
}
