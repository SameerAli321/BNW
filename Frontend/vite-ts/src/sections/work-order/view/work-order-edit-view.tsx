import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetWorkOrder } from 'src/actions/work-orders';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { WorkOrderCreateView } from './work-order-create-view';

// ----------------------------------------------------------------------

/**
 * Edit a work order — the create form, pre-filled. Only until the first decision (`canEdit` from
 * the backend, which also enforces it).
 */
export function WorkOrderEditView() {
  const { id = '' } = useParams();
  const { workOrder, workOrderLoading, workOrderError } = useGetWorkOrder(id);

  if (workOrderLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (workOrderError || !workOrder || !workOrder.canEdit) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title={
            workOrder
              ? 'This work order can no longer be amended'
              : 'Unable to load this work order'
          }
          description={
            workOrder
              ? 'It has already been paid / issued, rejected or voided.'
              : "Either it doesn't exist, or you don't have permission to view it."
          }
          action={
            <Button
              component={RouterLink}
              href={
                workOrder
                  ? paths.dashboard.workOrders.details(workOrder.id)
                  : paths.dashboard.workOrders.root
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

  return <WorkOrderCreateView key={workOrder.updatedAt} current={workOrder} />;
}
