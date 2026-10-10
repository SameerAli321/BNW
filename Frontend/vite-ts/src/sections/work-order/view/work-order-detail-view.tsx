import { useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { fDate, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fPkr,
  cancelWorkOrder,
  PROCESSOR_ROLES,
  useGetWorkOrder,
  processWorkOrder,
  openWorkOrderReceipt,
  downloadWorkOrderPdf,
  submitWorkOrderCeoDecision,
  submitWorkOrderManagerDecision,
} from 'src/actions/work-orders';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LeaveDecisionForm } from 'src/sections/leave/leave-components';
import { HrFormField, HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

import { WorkOrderSteps, WorkOrderTypeLabel, WorkOrderStatusLabel } from '../work-order-components';

// ----------------------------------------------------------------------

const decisionText = (approved: boolean | null) =>
  approved === null ? null : approved ? 'Approved' : 'Not approved';
const signedBy = (signature: string | null, at: string | null) =>
  signature ? `${signature}${at ? ` — ${fDateTime(at)}` : ''}` : null;

/**
 * One work order: the request, the approval chain, and each approver's section — where the
 * person whose turn it is approves / rejects with a typed signature. Payroll / HR can add a
 * payment reference or asset tag on the final step.
 */
export function WorkOrderDetailView() {
  const { id = '' } = useParams();
  const { user } = useAuthContext();
  const { workOrder: order, workOrderLoading, workOrderError } = useGetWorkOrder(id);
  const [busy, setBusy] = useState<'pdf' | 'receipt' | 'cancel' | null>(null);
  const [reference, setReference] = useState('');

  if (workOrderLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }
  if (workOrderError || !order) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Work order"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Work orders', href: paths.dashboard.workOrders.root },
            { name: 'Not found' },
          ]}
          sx={{ mb: 3 }}
        />
        <EmptyContent filled title="Unable to load this work order" description="It doesn't exist, or you don't have access to it." sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  const isReimbursement = order.type === 'REIMBURSEMENT';
  const isOwner = user?.id === order.employeeId;
  const canManagerAct = order.status === 'PENDING_MANAGER' && user?.id === order.managerId;
  const canCeoAct = order.status === 'PENDING_CEO' && user?.role === 'CEO';
  const canProcess =
    order.status === 'PENDING_PROCESSING' && PROCESSOR_ROLES[order.type].includes(user?.role ?? '') && !isOwner;
  const canCancel = isOwner && ['PENDING_MANAGER', 'PENDING_CEO', 'PENDING_PROCESSING'].includes(order.status);

  const run = async (kind: 'pdf' | 'receipt' | 'cancel', action: () => Promise<unknown>, success?: string) => {
    setBusy(kind);
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong!');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading={order.title}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Work orders', href: paths.dashboard.workOrders.root },
          { name: `WO-${order.id}` },
        ]}
        action={
          <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
            <WorkOrderStatusLabel status={order.status} type={order.type} />
            {canCancel && (
              <Button
                color="error"
                variant="outlined"
                loading={busy === 'cancel'}
                onClick={() => {
                  if (window.confirm('Cancel this request?')) {
                    run('cancel', () => cancelWorkOrder(order.id), 'Request cancelled');
                  }
                }}
              >
                Cancel request
              </Button>
            )}
            <Button
              variant="outlined"
              loading={busy === 'pdf'}
              startIcon={<Iconify icon="eva:cloud-download-fill" />}
              onClick={() => run('pdf', () => downloadWorkOrderPdf(order.id))}
            >
              Download (PDF)
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <WorkOrderSteps order={order} />
        </Card>

        <HrFormSection title="Employee">
          <HrFormField label="Employee code" value={order.employeeCode} />
          <HrFormField label="Employee name" value={order.employeeName} />
          <HrFormField label="Designation" value={order.employeeDesignation} />
          <HrFormField label="Department" value={order.employeeDepartment} />
        </HrFormSection>

        <HrFormSection title={isReimbursement ? 'Reimbursement claim' : 'Equipment request'}>
          <HrFormField label="Type" value={<WorkOrderTypeLabel type={order.type} />} />
          <HrFormField label={isReimbursement ? 'Expense' : 'Item'} value={order.title} />
          <HrFormField label="Category" value={order.category} />
          {isReimbursement ? (
            <>
              <HrFormField label="Amount claimed" value={fPkr(order.amount)} />
              <HrFormField label="Date of expense" value={order.expenseDate ? fDate(order.expenseDate) : null} />
            </>
          ) : (
            <>
              <HrFormField label="Quantity" value={String(order.quantity ?? 1)} />
              <HrFormField label="Needed by" value={order.neededBy ? fDate(order.neededBy) : null} />
              <HrFormField label="Estimated cost" value={order.amount !== null ? fPkr(order.amount) : null} />
            </>
          )}
          <HrFormField label="Details" value={order.description} />
          <HrFormField
            label={isReimbursement ? 'Receipt' : 'Quotation'}
            value={
              order.hasReceipt ? (
                <Button
                  size="small"
                  variant="soft"
                  loading={busy === 'receipt'}
                  startIcon={<Iconify icon="eva:attach-2-fill" width={16} />}
                  onClick={() => run('receipt', () => openWorkOrderReceipt(order.id))}
                >
                  {order.receiptOriginalName ?? 'Open file'}
                </Button>
              ) : (
                'None attached'
              )
            }
          />
          <HrFormField label="Submitted on" value={fDateTime(order.createdAt)} />
        </HrFormSection>

        {order.managerId && (
          <HrFormSection title="Approval of the line manager">
            {canManagerAct ? (
              <LeaveDecisionForm
                key={order.updatedAt}
                approveLabel={order.ceoRequired ? 'Approve & send to CEO' : `Approve & send to ${isReimbursement ? 'Payroll' : 'HR'}`}
                signatureLabel="Signature of line manager"
                onSubmit={async (payload) => {
                  await submitWorkOrderManagerDecision(order.id, payload);
                  toast.success(payload.approved ? 'Approved and sent on!' : 'Marked as not approved');
                }}
              />
            ) : (
              <>
                <HrFormField label="Line manager" value={order.managerName} />
                <HrFormField label="Decision" value={decisionText(order.managerApproved) ?? 'Waiting'} />
                <HrFormField label="Remarks" value={order.managerRemarks} />
                <HrFormField label="Signature" value={signedBy(order.managerSignatureText, order.managerSignedAt)} />
              </>
            )}
          </HrFormSection>
        )}

        {order.ceoRequired && (
          <HrFormSection title="Approval of the CEO">
            {canCeoAct ? (
              <LeaveDecisionForm
                key={order.updatedAt}
                approveLabel={`Approve & send to ${isReimbursement ? 'Payroll' : 'HR'}`}
                signatureLabel="Signature of the Chief Executive Officer"
                onSubmit={async (payload) => {
                  await submitWorkOrderCeoDecision(order.id, payload);
                  toast.success(payload.approved ? 'Approved!' : 'Marked as not approved');
                }}
              />
            ) : (
              <>
                <HrFormField label="Decision" value={decisionText(order.ceoApproved) ?? 'Waiting'} />
                <HrFormField label="Remarks" value={order.ceoRemarks} />
                <HrFormField label="Signature" value={signedBy(order.ceoSignatureText, order.ceoSignedAt)} />
              </>
            )}
          </HrFormSection>
        )}

        <HrFormSection title={isReimbursement ? 'For use by Finance / Payroll' : 'For use by the HRD'}>
          {canProcess ? (
            <>
              <TextField
                label={isReimbursement ? 'Payment reference (optional)' : 'Asset tag / serial number (optional)'}
                placeholder={isReimbursement ? 'e.g. bank transfer ID, or "paid with October salary"' : 'e.g. BNW-LAP-014'}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 200 } }}
                fullWidth
              />
              <LeaveDecisionForm
                key={order.updatedAt}
                approveLabel={isReimbursement ? 'Approve & mark paid' : 'Approve & mark issued'}
                signatureLabel={isReimbursement ? 'Payroll — name & signature' : 'Human Resource Department — name & signature'}
                onSubmit={async (payload) => {
                  await processWorkOrder(order.id, { ...payload, reference: reference.trim() || undefined });
                  toast.success(payload.approved ? (isReimbursement ? 'Marked as paid!' : 'Marked as issued!') : 'Marked as not approved');
                }}
              />
            </>
          ) : (
            <>
              <HrFormField label="Decision" value={decisionText(order.processorApproved) ?? 'Waiting'} />
              <HrFormField
                label={isReimbursement ? 'Payment reference' : 'Asset tag / serial no.'}
                value={order.processorReference}
              />
              <HrFormField label="Remarks" value={order.processorRemarks} />
              <HrFormField
                label={isReimbursement ? 'Payroll' : 'Human Resource Department'}
                value={signedBy(order.processorSignatureText, order.processedAt)}
              />
            </>
          )}
        </HrFormSection>

        {order.status === 'CANCELLED' && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            This request was cancelled by the employee.
          </Typography>
        )}
      </Stack>
    </DashboardContent>
  );
}
