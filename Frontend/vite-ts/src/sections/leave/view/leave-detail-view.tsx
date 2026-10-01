import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  cancelLeaveRequest,
  useGetLeaveRequest,
  useGetLeaveBalance,
  submitLeaveHrDecision,
  downloadLeaveRequestPdf,
  submitLeaveManagerDecision,
} from 'src/actions/leave';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormField, HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

import { leaveDatesText, LeaveStatusLabel, LeaveDecisionForm } from '../leave-components';

// ----------------------------------------------------------------------

const signedBy = (signature: string | null, signedAt: string | null) =>
  signature ? `${signature}${signedAt ? ` — ${fDate(signedAt)}` : ''}` : null;

const decisionText = (approved: boolean | null) =>
  approved === null ? null : approved ? 'Approved' : 'Not approved';

/**
 * One leave request: the application, the employee's balance for that leave type, then the line
 * manager's and HR's decisions. The manager / HR act here while it's waiting on them; the employee
 * can cancel it while it's still pending.
 */
export function LeaveDetailView() {
  const { id = '' } = useParams();
  const { user } = useAuthContext();
  const { request, requestLoading, requestError } = useGetLeaveRequest(id);
  const { balances } = useGetLeaveBalance(
    request?.employeeId,
    request ? Number(request.startDate.slice(0, 4)) : undefined
  );
  const [busy, setBusy] = useState<'download' | 'cancel' | null>(null);

  if (requestLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (requestError || !request) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Leave request"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Leave & Holidays', href: paths.dashboard.leaveRequests.root },
            { name: 'Not found' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Stack sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          Unable to load this leave request — either it doesn&apos;t exist, or you don&apos;t have
          permission to view it.
        </Stack>
      </DashboardContent>
    );
  }

  const isOwner = user?.id === request.employeeId;
  const canManagerAct = request.status === 'PENDING_MANAGER' && user?.id === request.managerId;
  const canHrAct = request.status === 'PENDING_HR' && ['HR', 'ADMIN'].includes(user?.role ?? '');
  const canCancel = isOwner && (request.status === 'PENDING_MANAGER' || request.status === 'PENDING_HR');
  const balance = balances.find((b) => b.leaveTypeId === request.leaveTypeId);

  const run = async (kind: 'download' | 'cancel', action: () => Promise<unknown>, success?: string) => {
    setBusy(kind);
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong!');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading={`${request.leaveTypeName} — ${request.employeeName}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Leave & Holidays', href: paths.dashboard.leaveRequests.root },
          { name: `#${request.id}` },
        ]}
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LeaveStatusLabel status={request.status} />
            {canCancel && (
              <Button
                color="error"
                variant="outlined"
                loading={busy === 'cancel'}
                onClick={() => run('cancel', () => cancelLeaveRequest(request.id), 'Leave request cancelled')}
              >
                Cancel request
              </Button>
            )}
            <Button
              variant="outlined"
              loading={busy === 'download'}
              startIcon={<Iconify icon="eva:cloud-download-fill" />}
              onClick={() => run('download', () => downloadLeaveRequestPdf(request.id))}
            >
              Download (PDF)
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        <HrFormSection title="Employee">
          <HrFormField label="Employee code" value={request.employeeCode} />
          <HrFormField label="Employee name" value={request.employeeName} />
          <HrFormField label="Designation" value={request.employeeDesignation} />
          <HrFormField label="Department" value={request.employeeDepartment} />
        </HrFormSection>

        <HrFormSection title="Leave details">
          <HrFormField label="Type of leave" value={request.leaveTypeName} />
          <HrFormField label="Dates" value={leaveDatesText(request)} />
          <HrFormField label="Reason" value={request.reason} />
          <HrFormField label="Contact during leave" value={request.contactDuringLeave} />
          <HrFormField label="Applied on" value={fDate(request.createdAt)} />
          {balance && (
            <HrFormField
              label={`Balance (${request.startDate.slice(0, 4)})`}
              value={
                balance.remaining === null
                  ? `No yearly limit — ${balance.used} day(s) taken`
                  : `${balance.remaining} of ${balance.annualQuota} day(s) left · ${balance.used} taken · ${balance.pending} pending`
              }
            />
          )}
        </HrFormSection>

        <HrFormSection title="Approval of the Line Manager">
          {canManagerAct ? (
            <LeaveDecisionForm
              key={request.updatedAt}
              approveLabel="Approve & send to HR"
              signatureLabel="Signature of line manager"
              onSubmit={async (payload) => {
                await submitLeaveManagerDecision(request.id, payload);
                toast.success(payload.approved ? 'Approved and sent to HR!' : 'Marked as not approved');
              }}
            />
          ) : (
            <>
              <HrFormField
                label="Line manager"
                value={request.managerName ?? 'No manager on record — sent straight to HR'}
              />
              {request.managerId && (
                <>
                  <HrFormField label="Decision" value={decisionText(request.managerApproved)} />
                  <HrFormField label="Remarks" value={request.managerRemarks} />
                  <HrFormField
                    label="Signature"
                    value={signedBy(request.managerSignatureText, request.managerSignedAt)}
                  />
                </>
              )}
            </>
          )}
        </HrFormSection>

        <HrFormSection title="For use by the HRD">
          {canHrAct ? (
            <LeaveDecisionForm
              key={request.updatedAt}
              approveLabel="Approve leave"
              signatureLabel="Human Resource Department — name & signature"
              onSubmit={async (payload) => {
                await submitLeaveHrDecision(request.id, payload);
                toast.success(payload.approved ? 'Leave approved!' : 'Marked as not approved');
              }}
            />
          ) : (
            <>
              <HrFormField label="Decision" value={decisionText(request.hrApproved)} />
              <HrFormField label="Remarks" value={request.hrRemarks} />
              <HrFormField
                label="Human Resource Department"
                value={signedBy(request.hrSignatureText, request.hrSignedAt)}
              />
            </>
          )}
        </HrFormSection>

        {request.status === 'CANCELLED' && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            This request was cancelled by the employee.
          </Typography>
        )}
      </Stack>
    </DashboardContent>
  );
}
