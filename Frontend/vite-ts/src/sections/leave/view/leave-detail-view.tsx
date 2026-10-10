import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  cancelLeaveRequest,
  useGetLeaveRequest,
  useGetLeaveBalance,
  submitLeaveHrDecision,
  decideLeaveCancellation,
  downloadLeaveRequestPdf,
  requestLeaveCancellation,
  submitLeaveManagerDecision,
} from 'src/actions/leave';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
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
 * can withdraw it while it's pending, or ask HR to cancel approved leave that hasn't started yet
 * (HR / Admin approve or reject that cancellation here too).
 */
export function LeaveDetailView() {
  const { id = '' } = useParams();
  const { user } = useAuthContext();
  const { request, requestLoading, requestError } = useGetLeaveRequest(id);
  const { balances } = useGetLeaveBalance(
    request?.employeeId,
    request ? Number(request.startDate.slice(0, 4)) : undefined
  );
  const [busy, setBusy] = useState<'download' | 'cancel' | 'decide' | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        <EmptyContent filled title="Unable to load this leave request" description="Either it doesn't exist, or you don't have permission to view it." sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  const isOwner = user?.id === request.employeeId;
  const canManagerAct = request.status === 'PENDING_MANAGER' && user?.id === request.managerId;
  const canHrAct = request.status === 'PENDING_HR' && ['HR', 'ADMIN'].includes(user?.role ?? '');
  // Pending: the employee can withdraw it. Approved and not started yet: they can ask HR to
  // cancel it. HR / Admin decide on that cancellation request.
  const today = new Date().toLocaleDateString('en-CA');
  const canCancel =
    isOwner && (request.status === 'PENDING_MANAGER' || request.status === 'PENDING_HR');
  const canRequestCancellation =
    isOwner && request.status === 'APPROVED' && request.startDate > today;
  const canDecideCancellation =
    request.status === 'CANCELLATION_REQUESTED' && ['HR', 'ADMIN'].includes(user?.role ?? '');
  const showCancellation = !!request.cancellationRequestedAt;
  const balance = balances.find((b) => b.leaveTypeId === request.leaveTypeId);

  const run = async (
    kind: 'download' | 'cancel' | 'decide',
    action: () => Promise<unknown>,
    success?: string
  ) => {
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
          <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
            <LeaveStatusLabel status={request.status} />
            {canCancel && (
              <Button
                color="error"
                variant="outlined"
                loading={busy === 'cancel'}
                onClick={() => setConfirmCancel(true)}
              >
                Withdraw request
              </Button>
            )}
            {canRequestCancellation && (
              <Button
                color="error"
                variant="outlined"
                loading={busy === 'cancel'}
                onClick={() => setCancelDialog(true)}
              >
                Request cancellation
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
                toast.success(
                  payload.approved ? 'Approved and sent to HR!' : 'Marked as not approved'
                );
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

        {showCancellation && (
          <HrFormSection title="Cancellation of approved leave">
            <HrFormField label="Reason for cancelling" value={request.cancellationReason} />
            <HrFormField
              label="Requested on"
              value={
                request.cancellationRequestedAt ? fDate(request.cancellationRequestedAt) : null
              }
            />
            {canDecideCancellation ? (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                  label="Remarks for the employee (optional)"
                  value={decisionRemarks}
                  onChange={(event) => setDecisionRemarks(event.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
                <Stack
                  direction={{ xs: 'column-reverse', sm: 'row' }}
                  spacing={1.5}
                  justifyContent="flex-end"
                >
                  <Button
                    variant="outlined"
                    color="inherit"
                    disabled={busy === 'decide'}
                    onClick={() =>
                      run(
                        'decide',
                        () =>
                          decideLeaveCancellation(request.id, {
                            approved: false,
                            remarks: decisionRemarks.trim() || undefined,
                          }),
                        'Cancellation rejected — the leave stays approved'
                      )
                    }
                  >
                    Reject — keep leave approved
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    loading={busy === 'decide'}
                    onClick={() =>
                      run(
                        'decide',
                        () =>
                          decideLeaveCancellation(request.id, {
                            approved: true,
                            remarks: decisionRemarks.trim() || undefined,
                          }),
                        'Leave cancelled — the employee has been emailed'
                      )
                    }
                  >
                    Approve cancellation
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <>
                <HrFormField
                  label="Decision"
                  value={
                    request.cancellationApproved === null
                      ? 'Waiting for HR'
                      : request.cancellationApproved
                        ? 'Cancellation approved — leave cancelled'
                        : 'Cancellation rejected — leave stays approved'
                  }
                />
                <HrFormField label="Remarks" value={request.cancellationRemarks} />
                <HrFormField
                  label="Decided by"
                  value={
                    request.cancellationDecidedByName
                      ? `${request.cancellationDecidedByName}${request.cancellationDecidedAt ? ` — ${fDate(request.cancellationDecidedAt)}` : ''}`
                      : null
                  }
                />
              </>
            )}
          </HrFormSection>
        )}

        {request.status === 'CANCELLED' && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {request.cancellationApproved
              ? 'This leave was cancelled at the employee’s request, approved by HR.'
              : 'This request was withdrawn by the employee before it was decided.'}
          </Typography>
        )}
      </Stack>
      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Withdraw this leave request?"
        content="It hasn't been decided yet. Your manager / HR will be told that they no longer need to review it."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmCancel(false);
              run('cancel', () => cancelLeaveRequest(request.id), 'Leave request withdrawn');
            }}
          >
            Withdraw request
          </Button>
        }
      />

      <Dialog
        open={cancelDialog}
        onClose={() => setCancelDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>Ask HR to cancel this approved leave</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Your {request.leaveTypeName} ({leaveDatesText(request)}) stays approved until HR
            decides. If they approve the cancellation, the {request.days} day(s) go back into your
            balance. You&apos;ll get an email either way.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Why do you want to cancel it?"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCancelDialog(false)}>
            Keep my leave
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={cancelReason.trim().length < 3}
            loading={busy === 'cancel'}
            onClick={async () => {
              await run(
                'cancel',
                () => requestLeaveCancellation(request.id, cancelReason.trim()),
                'Cancellation request sent to HR'
              );
              setCancelDialog(false);
              setCancelReason('');
            }}
          >
            Send cancellation request
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
