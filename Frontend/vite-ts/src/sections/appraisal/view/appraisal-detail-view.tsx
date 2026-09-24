import { useBoolean } from 'minimal-shared/hooks';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  useGetAppraisal,
  submitCeoDecision,
  submitManagerDecision,
} from 'src/actions/appraisals';

import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { AppraisalTimeline } from '../appraisal-timeline';
import { AppraisalStatusLabel } from '../appraisal-status-label';
import { AppraisalDecisionDialog } from '../appraisal-decision-dialog';

// ----------------------------------------------------------------------

/**
 * Appraisal detail — self-evaluation, manager/CEO remarks+message+decision once given, an
 * `events` timeline (same @mui/lab Timeline pattern as the Letter Engine), and role+status-gated
 * decision dialogs per docs/API_CONTRACT_SPRINT4.md:
 * - the request's manager, while `status = PENDING_MANAGER`: remarks + message + Accept/Reject.
 * - the CEO, while `status = PENDING_CEO`: remarks + message + Accept/Reject/Send back to manager.
 *
 * No RoleBasedGuard — any authenticated caller can attempt `GET /appraisal-requests/:id` (the
 * contract allows HR/ADMIN/CEO/the employee/the request's manager); the backend is the real gate,
 * same "unable to load / no permission" fallback pattern as the Letter Engine's detail page.
 */
export function AppraisalDetailView() {
  const { id = '' } = useParams();
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';
  const currentUserId = currentAuthUser?.id;

  const { appraisal, appraisalLoading, appraisalError } = useGetAppraisal(id);

  const managerDialog = useBoolean();
  const ceoDialog = useBoolean();

  if (appraisalLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (appraisalError || !appraisal) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Appraisal"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Appraisals', href: paths.dashboard.appraisals.root },
            { name: 'Not found' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Stack sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          Unable to load this appraisal — either it doesn&apos;t exist, or you don&apos;t have
          permission to view it.
        </Stack>
      </DashboardContent>
    );
  }

  const isTheManager =
    !!currentUserId && !!appraisal.managerId && currentUserId === appraisal.managerId;
  const isCeo = currentRole === 'CEO';

  const canManagerAct = isTheManager && appraisal.status === 'PENDING_MANAGER';
  const canCeoAct = isCeo && appraisal.status === 'PENDING_CEO';

  const waitingMessage = (() => {
    if (canManagerAct || canCeoAct) return null;
    switch (appraisal.status) {
      case 'PENDING_MANAGER':
        return 'Waiting for the manager to review.';
      case 'PENDING_CEO':
        return 'Waiting for the CEO to review.';
      case 'MANAGER_REJECTED':
        return 'Rejected by the manager — this appraisal has ended.';
      case 'CEO_ACCEPTED':
        return 'Accepted by the CEO — this appraisal is complete.';
      case 'CEO_REJECTED':
        return 'Rejected by the CEO — this appraisal has ended.';
      default:
        return null;
    }
  })();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Appraisal #${appraisal.id}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Appraisals', href: paths.dashboard.appraisals.root },
          { name: appraisal.employeeName },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Card sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ mb: 3 }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h6">{appraisal.employeeName}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Manager: {appraisal.managerName ?? '—'}
                  </Typography>
                </Stack>
                <AppraisalStatusLabel status={appraisal.status} />
              </Stack>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Self-evaluation
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}
              >
                {appraisal.selfEvaluation}
              </Typography>

              <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
                {canManagerAct && (
                  <Button variant="contained" onClick={managerDialog.onTrue}>
                    Review as manager
                  </Button>
                )}

                {canCeoAct && (
                  <Button variant="contained" onClick={ceoDialog.onTrue}>
                    Review as CEO
                  </Button>
                )}

                {waitingMessage && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {waitingMessage}
                  </Typography>
                )}
              </Stack>
            </Card>

            {appraisal.managerDecision && (
              <Card>
                <CardHeader title="Manager's review" />
                <Stack sx={{ p: 3, pt: 2 }} spacing={1}>
                  <Typography variant="body2">
                    Decision: <strong>{appraisal.managerDecision}</strong>
                    {appraisal.managerDecidedAt &&
                      ` · ${new Date(appraisal.managerDecidedAt).toLocaleString()}`}
                  </Typography>
                  {appraisal.managerRemarks && (
                    <Typography variant="body2">
                      <strong>Remarks:</strong> {appraisal.managerRemarks}
                    </Typography>
                  )}
                  {appraisal.managerMessage && (
                    <Typography variant="body2">
                      <strong>Message:</strong> {appraisal.managerMessage}
                    </Typography>
                  )}
                </Stack>
              </Card>
            )}

            {appraisal.ceoDecision && (
              <Card>
                <CardHeader title="CEO's review" />
                <Stack sx={{ p: 3, pt: 2 }} spacing={1}>
                  <Typography variant="body2">
                    Decision: <strong>{appraisal.ceoDecision}</strong>
                    {appraisal.ceoDecidedAt &&
                      ` · ${new Date(appraisal.ceoDecidedAt).toLocaleString()}`}
                  </Typography>
                  {appraisal.ceoRemarks && (
                    <Typography variant="body2">
                      <strong>Remarks:</strong> {appraisal.ceoRemarks}
                    </Typography>
                  )}
                  {appraisal.ceoMessage && (
                    <Typography variant="body2">
                      <strong>Message:</strong> {appraisal.ceoMessage}
                    </Typography>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppraisalTimeline events={appraisal.events ?? []} />
        </Grid>
      </Grid>

      {canManagerAct && (
        <AppraisalDecisionDialog
          open={managerDialog.value}
          onClose={managerDialog.onFalse}
          title="Review as manager"
          description="Add remarks and a message for the employee, then accept (moves on to the CEO) or reject (ends the appraisal here)."
          buttons={[
            { decision: 'REJECTED', label: 'Reject', color: 'error', variant: 'outlined' },
            { decision: 'ACCEPTED', label: 'Accept', variant: 'contained' },
          ]}
          onConfirm={(data, decision) => submitManagerDecision(appraisal.id, { ...data, decision })}
        />
      )}

      {canCeoAct && (
        <AppraisalDecisionDialog
          open={ceoDialog.value}
          onClose={ceoDialog.onFalse}
          title="Review as CEO"
          description="Add remarks and a message, then accept, reject, or send it back to the manager for another look."
          buttons={[
            { decision: 'SEND_BACK', label: 'Send back to manager', color: 'warning', variant: 'outlined' },
            { decision: 'REJECTED', label: 'Reject', color: 'error', variant: 'outlined' },
            { decision: 'ACCEPTED', label: 'Accept', variant: 'contained' },
          ]}
          onConfirm={(data, decision) => submitCeoDecision(appraisal.id, { ...data, decision })}
        />
      )}
    </DashboardContent>
  );
}
