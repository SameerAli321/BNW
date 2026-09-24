import { useState } from 'react';
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
  updateLetter,
  useGetLetter,
  ceoSignLetter,
  previewLetter,
  downloadLetterPdf,
  submitLetterToCeo,
  employeeSignLetter,
  sendLetterToEmployee,
  requestLetterChanges,
  useGetLetterTemplateFields,
} from 'src/actions/letters';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { LetterTimeline } from '../letter-timeline';
import { LetterSignDialog } from '../letter-sign-dialog';
import { LetterStatusLabel } from '../letter-status-label';
import { LetterManualFields } from '../letter-manual-fields';
import { LetterRequestChangesDialog } from '../letter-request-changes-dialog';

// ----------------------------------------------------------------------

/**
 * Letter detail — fields, status, `events` timeline, `signatures`, PDF preview/download, and the
 * status-appropriate action buttons, each gated by BOTH the caller's role AND the letter's
 * current status per docs/API_CONTRACT_SPRINT3.md's endpoint table. Any authenticated caller can
 * attempt `GET /letters/:id` (HR/CEO/ADMIN or the subject themselves per the contract) — the
 * backend is the real gate; a fetch error here just shows an inline message, same pattern as the
 * Sprint 2 E-record page.
 */
export function LetterDetailView() {
  const { id = '' } = useParams();
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';
  const currentUserId = currentAuthUser?.id;

  const { letter, letterLoading, letterError } = useGetLetter(id);
  const { fieldsSchema } = useGetLetterTemplateFields(letter?.templateId);

  const [editValues, setEditValues] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const signDialog = useBoolean();
  const requestChangesDialog = useBoolean();

  if (letterLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (letterError || !letter) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Letter"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Letters', href: paths.dashboard.letters.root },
            { name: 'Not found' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Stack sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          Unable to load this letter — either it doesn&apos;t exist, or you don&apos;t have
          permission to view it.
        </Stack>
      </DashboardContent>
    );
  }

  const isHrAdmin = currentRole === 'HR' || currentRole === 'ADMIN';
  const isCeo = currentRole === 'CEO';
  const isSelfSubject = !!currentUserId && currentUserId === letter.subjectUserId;

  const canEditFields =
    isHrAdmin && (letter.status === 'DRAFT' || letter.status === 'CHANGES_REQUESTED');
  const canSubmitToCeo = canEditFields;
  const canPreview = isHrAdmin;
  const canCeoAct = isCeo && letter.status === 'PENDING_CEO';
  const canSendToEmployee = isHrAdmin && letter.status === 'CEO_SIGNED';
  const canEmployeeSign = isSelfSubject && letter.status === 'SENT_TO_EMPLOYEE';
  const canDownload = letter.hasPdf;

  const hasAnyAction =
    canEditFields || canPreview || canDownload || canCeoAct || canSendToEmployee || canEmployeeSign;

  // When nobody's role/the letter's current status gives the viewer anything to do (e.g. the CEO
  // looking at a letter they already signed, waiting on HR to send it on), say so explicitly
  // instead of just rendering an empty row of buttons — which reads as "the app is broken" rather
  // than "there's nothing for you to do right now".
  const waitingMessage = (() => {
    if (hasAnyAction) return null;
    switch (letter.status) {
      case 'DRAFT':
      case 'CHANGES_REQUESTED':
        return 'Being prepared by HR/Admin.';
      case 'PENDING_CEO':
        return 'Waiting for the CEO to review and sign.';
      case 'CEO_SIGNED':
        return 'Signed by the CEO — waiting for HR/Admin to send it to the employee.';
      case 'SENT_TO_EMPLOYEE':
        return isSelfSubject ? null : `Waiting for ${letter.subjectName} to sign.`;
      case 'SIGNED':
        return 'Fully signed by both the CEO and the employee.';
      default:
        return null;
    }
  })();

  const values = editValues ?? letter.fieldValues;

  const handleFieldChange = (key: string, value: string) => {
    setEditValues({ ...values, [key]: value });
  };

  const handleSaveFields = async () => {
    if (!editValues) return;
    setSaving(true);
    try {
      await updateLetter(letter.id, { fieldValues: editValues });
      toast.success('Saved!');
      setEditValues(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setBusy(true);
    try {
      await previewLetter(letter.id);
      toast.success('PDF rendered — download it below.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Preview failed!');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      await downloadLetterPdf(letter.id, `${letter.type.toLowerCase()}-letter-${letter.id}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Download failed!');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitToCeo = async () => {
    setBusy(true);
    try {
      await submitLetterToCeo(letter.id);
      toast.success('Submitted to CEO!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Submit failed!');
    } finally {
      setBusy(false);
    }
  };

  const handleSendToEmployee = async () => {
    setBusy(true);
    try {
      await sendLetterToEmployee(letter.id);
      toast.success('Sent to employee!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Send failed!');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Letter #${letter.id}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Letters', href: paths.dashboard.letters.root },
          { name: letter.subjectName },
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
                  <Typography variant="h6">{letter.templateName}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {letter.type} · for {letter.subjectName} · prepared by {letter.preparedByName}
                  </Typography>
                </Stack>
                <LetterStatusLabel status={letter.status} />
              </Stack>

              <LetterManualFields
                fields={fieldsSchema}
                values={values}
                onChange={handleFieldChange}
                disabled={!canEditFields}
              />

              <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
                {canEditFields && editValues && (
                  <Button variant="contained" loading={saving} onClick={handleSaveFields}>
                    Save changes
                  </Button>
                )}

                {canPreview && (
                  <Button
                    variant="outlined"
                    startIcon={<Iconify icon="solar:file-text-bold" />}
                    onClick={handlePreview}
                    disabled={busy}
                  >
                    Render / re-render preview
                  </Button>
                )}

                {canDownload && (
                  <Button
                    variant="outlined"
                    startIcon={<Iconify icon="solar:download-bold" />}
                    onClick={handleDownload}
                    disabled={busy}
                  >
                    Download PDF
                  </Button>
                )}

                {canSubmitToCeo && (
                  <Button variant="contained" onClick={handleSubmitToCeo} disabled={busy}>
                    Submit to CEO
                  </Button>
                )}

                {canCeoAct && (
                  <>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={requestChangesDialog.onTrue}
                    >
                      Request changes
                    </Button>
                    <Button variant="contained" onClick={signDialog.onTrue}>
                      Sign as CEO
                    </Button>
                  </>
                )}

                {canSendToEmployee && (
                  <Button variant="contained" onClick={handleSendToEmployee} disabled={busy}>
                    Send to employee
                  </Button>
                )}

                {canEmployeeSign && (
                  <Button variant="contained" onClick={signDialog.onTrue}>
                    Sign now
                  </Button>
                )}

                {waitingMessage && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {waitingMessage}
                  </Typography>
                )}
              </Stack>
            </Card>

            <Card>
              <CardHeader title="Signatures" />
              <Stack sx={{ p: 3, pt: 2 }} spacing={1.5}>
                {!letter.signatures?.length && (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    No signatures yet.
                  </Typography>
                )}
                {letter.signatures?.map((sig) => (
                  <Stack key={sig.id} direction="row" justifyContent="space-between">
                    <Typography variant="body2">
                      <strong>{sig.signerName}</strong> ({sig.signerRole})
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {new Date(sig.signedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <LetterTimeline events={letter.events ?? []} />
        </Grid>
      </Grid>

      {canCeoAct && (
        <>
          <LetterSignDialog
            open={signDialog.value}
            onClose={signDialog.onFalse}
            title="Sign as CEO"
            description="This countersigns the letter and moves it to CEO signed."
            onConfirm={(signatureText) => ceoSignLetter(letter.id, signatureText)}
          />
          <LetterRequestChangesDialog
            open={requestChangesDialog.value}
            onClose={requestChangesDialog.onFalse}
            onConfirm={(comment) => requestLetterChanges(letter.id, comment)}
          />
        </>
      )}

      {canEmployeeSign && (
        <LetterSignDialog
          open={signDialog.value}
          onClose={signDialog.onFalse}
          title="Sign your letter"
          description="Typing your name below confirms you've read and accept this letter."
          onConfirm={(signatureText) =>
            employeeSignLetter(letter.id, signatureText, letter.subjectUserId)
          }
        />
      )}
    </DashboardContent>
  );
}
