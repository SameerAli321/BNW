import type { OnboardingFormDto } from 'src/types/onboarding-form';

import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  recordOnboardingForm,
  useGetOnboardingForm,
  downloadOnboardingFormPdf,
} from 'src/actions/onboarding-forms';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

import { OnboardingFormDetails, OnboardingFormStatusLabel } from '../onboarding-form-details';

// ----------------------------------------------------------------------

/** "HRD Use Only" — HR / ADMIN. Recording files a PDF copy into the employee's E-record. */
function HrRecordForm({ form }: { form: OnboardingFormDto }) {
  const [recordedTo, setRecordedTo] = useState('');
  const [comments, setComments] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!signatureText.trim()) {
      toast.error('Type your full name to sign');
      return;
    }
    setSaving(true);
    try {
      await recordOnboardingForm(form.id, { recordedTo, comments, signatureText });
      toast.success("Recorded — a PDF copy was filed in the employee's E-record");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <HrFormSection title="HRD Use Only">
      <TextField
        label="Recorded to"
        placeholder="e.g. Personnel file / payroll"
        value={recordedTo}
        onChange={(event) => setRecordedTo(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        fullWidth
      />
      <TextField
        label="Comments"
        value={comments}
        onChange={(event) => setComments(event.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Signature"
        placeholder="Type your full name to sign"
        value={signatureText}
        onChange={(event) => setSignatureText(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        fullWidth
      />
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" loading={saving} onClick={onSave}>
          Record &amp; file to E-record
        </Button>
      </Stack>
    </HrFormSection>
  );
}

/** One employee's onboarding form, for HR / ADMIN / CEO (and the employee themselves). */
export function OnboardingFormDetailView() {
  const { id = '' } = useParams();
  const { user } = useAuthContext();
  const { form, formLoading, formError } = useGetOnboardingForm(id);
  const [downloading, setDownloading] = useState(false);

  if (formLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (formError || !form) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Onboarding form"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
            { name: 'Onboarding Forms', href: paths.dashboard.onboardingForms.root },
            { name: 'Not found' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Stack sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          Unable to load this form — either it doesn&apos;t exist, or you don&apos;t have
          permission to view it.
        </Stack>
      </DashboardContent>
    );
  }

  const canRecord = ['HR', 'ADMIN'].includes(user?.role ?? '') && form.status === 'SUBMITTED';

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadOnboardingFormPdf(form.id, form.fullName);
    } catch (error) {
      console.error(error);
      toast.error('Download failed!');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading={`Onboarding form — ${form.fullName}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Onboarding Forms', href: paths.dashboard.onboardingForms.root },
          { name: form.fullName },
        ]}
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <OnboardingFormStatusLabel status={form.status} />
            <Button
              variant="outlined"
              loading={downloading}
              startIcon={<Iconify icon="eva:cloud-download-fill" />}
              onClick={onDownload}
            >
              Download (PDF)
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        <OnboardingFormDetails form={form} hideHrSection={canRecord} />
        {canRecord && <HrRecordForm form={form} />}
      </Stack>
    </DashboardContent>
  );
}
