import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetComplaint } from 'src/actions/complaints';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { ComplaintCreateView } from './complaint-create-view';

// ----------------------------------------------------------------------

/**
 * Edit a complaint — the complaint form, pre-filled. Only until HR responds (`canEdit` from the
 * backend, which also enforces it).
 */
export function ComplaintEditView() {
  const { id = '' } = useParams();
  const { complaint, complaintLoading, complaintError } = useGetComplaint(id);

  if (complaintLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (complaintError || !complaint || !complaint.canEdit) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title={complaint ? 'This complaint can no longer be edited' : 'Unable to load this complaint'}
          description={
            complaint
              ? 'HR has already responded to it.'
              : "Either it doesn't exist, or you don't have permission to view it."
          }
          action={
            <Button
              component={RouterLink}
              href={
                complaint
                  ? paths.dashboard.complaints.details(complaint.id)
                  : paths.dashboard.complaints.root
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

  return <ComplaintCreateView key={complaint.updatedAt} current={complaint} />;
}
