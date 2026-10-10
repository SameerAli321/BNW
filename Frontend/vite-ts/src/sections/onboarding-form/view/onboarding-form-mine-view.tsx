import type {
  OnboardingFormDto,
  OnboardingFormField,
  MyOnboardingFormResponse,
} from 'src/types/onboarding-form';

import { useState } from 'react';

import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  submitMyOnboardingForm,
  useGetMyOnboardingForm,
  downloadOnboardingFormPdf,
} from 'src/actions/onboarding-forms';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

import { ONBOARDING_FORM_FIELDS } from 'src/types/onboarding-form';

import { OnboardingFormDetails, OnboardingFormStatusLabel } from '../onboarding-form-details';

// ----------------------------------------------------------------------

type Values = Record<OnboardingFormField, string>;

function initialValues(
  form: OnboardingFormDto | null,
  prefill: MyOnboardingFormResponse['prefill']
): Values {
  const source = form ?? prefill;
  return Object.fromEntries(
    ONBOARDING_FORM_FIELDS.map((key) => [key, source[key] ?? ''])
  ) as Values;
}

/**
 * The logged-in user's own onboarding form. Pre-filled from their E-record the first time; they
 * can update and resubmit it until HR records it, after which it's read-only. Submitting also
 * updates their E-record profile (phone, address, date of birth, CNIC, emergency contact, bank).
 */
export function OnboardingFormMineView() {
  const { myForm, prefill, myFormLoading } = useGetMyOnboardingForm();

  if (myFormLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  // Keyed so the editor resets to the saved values after each submit.
  return <OnboardingFormEditor key={myForm?.updatedAt ?? 'new'} myForm={myForm} prefill={prefill} />;
}

type EditorProps = {
  myForm: OnboardingFormDto | null;
  prefill: MyOnboardingFormResponse['prefill'];
};

function OnboardingFormEditor({ myForm, prefill }: EditorProps) {
  const { user } = useAuthContext();
  const [values, setValues] = useState<Values>(() => initialValues(myForm, prefill));
  const [acknowledged, setAcknowledged] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const recorded = myForm?.status === 'RECORDED';

  const field = (key: OnboardingFormField, extra: Record<string, unknown> = {}) => ({
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [key]: event.target.value })),
    fullWidth: true,
    ...extra,
  });

  const onSubmit = async () => {
    if (!acknowledged) {
      toast.error('Tick the acknowledgment to confirm the information is accurate');
      return;
    }
    if (!signatureText.trim()) {
      toast.error('Type your full name to sign');
      return;
    }
    setSubmitting(true);
    try {
      await submitMyOnboardingForm({ ...values, acknowledged, signatureText });
      toast.success(myForm ? 'Onboarding form updated!' : 'Onboarding form submitted to HR!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Submit failed!');
    } finally {
      setSubmitting(false);
    }
  };

  const onDownload = async () => {
    if (!myForm) return;
    setDownloading(true);
    try {
      await downloadOnboardingFormPdf(myForm.id, myForm.fullName);
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
        heading="Employee onboarding form"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms }, { name: 'Onboarding Form' }]}
        action={
          myForm && (
            <Stack direction="row" alignItems="center" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
              <OnboardingFormStatusLabel status={myForm.status} />
              <Button
                variant="outlined"
                loading={downloading}
                startIcon={<Iconify icon="eva:cloud-download-fill" />}
                onClick={onDownload}
              >
                Download (PDF)
              </Button>
            </Stack>
          )
        }
        sx={{ mb: 3 }}
      />

      {recorded ? (
        <>
          <Alert severity="success" sx={{ mb: 3 }}>
            HR recorded your onboarding form on {fDate(myForm.hrSignedAt)}. A copy is in your{' '}
            <Link component={RouterLink} href={paths.dashboard.myRecord}>
              E-record
            </Link>
            . Ask HR if anything needs to change.
          </Alert>
          <Stack spacing={3}>
            <OnboardingFormDetails form={myForm} />
          </Stack>
        </>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            {myForm
              ? `Submitted on ${fDate(myForm.employeeSignedAt)}. You can update and resubmit it until HR records it.`
              : 'Some fields are pre-filled from your E-record. Submitting also updates your E-record with these details.'}
          </Alert>

          <Stack spacing={3}>
            <HrFormSection title="Personal Information">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Full name"
                    value={user ? `${user.firstName} ${user.lastName}` : ''}
                    fullWidth
                    disabled
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Job title hired on"
                    value={user?.designation ?? '—'}
                    fullWidth
                    disabled
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="date"
                    label="Date of birth"
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...field('dateOfBirth')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="CNIC / social security number (if applicable)"
                    slotProps={{ htmlInput: { maxLength: 60 } }}
                    {...field('nationalId')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Date of joining"
                    value={user?.joinDate ? fDate(user.joinDate) : '—'}
                    fullWidth
                    disabled
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Email address" value={user?.email ?? ''} fullWidth disabled />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Street address"
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                    {...field('streetAddress')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="City" slotProps={{ htmlInput: { maxLength: 100 } }} {...field('city')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="State / province"
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    {...field('state')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Zip code"
                    slotProps={{ htmlInput: { maxLength: 20 } }}
                    {...field('zipCode')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone number"
                    slotProps={{ htmlInput: { maxLength: 30 } }}
                    {...field('phone')}
                  />
                </Grid>
              </Grid>
            </HrFormSection>

            <HrFormSection title="Employment Information">
              <TextField
                label="Reason for leaving previous job"
                multiline
                minRows={2}
                {...field('reasonForLeaving')}
              />
              <TextField
                label="Work responsibilities"
                multiline
                minRows={3}
                {...field('workResponsibilities')}
              />
            </HrFormSection>

            <HrFormSection title="Emergency Contact Information">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Emergency contact name"
                    slotProps={{ htmlInput: { maxLength: 150 } }}
                    {...field('emergencyContactName')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Relationship"
                    slotProps={{ htmlInput: { maxLength: 60 } }}
                    {...field('emergencyContactRelationship')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone number"
                    slotProps={{ htmlInput: { maxLength: 30 } }}
                    {...field('emergencyContactPhone')}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Address" multiline minRows={2} {...field('emergencyContactAddress')} />
                </Grid>
              </Grid>
            </HrFormSection>

            <HrFormSection title="Bank Details">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Bank name"
                    slotProps={{ htmlInput: { maxLength: 150 } }}
                    {...field('bankName')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Account title"
                    slotProps={{ htmlInput: { maxLength: 150 } }}
                    {...field('accountTitle')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Account number"
                    slotProps={{ htmlInput: { maxLength: 60 } }}
                    {...field('accountNumber')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="IBAN" slotProps={{ htmlInput: { maxLength: 40 } }} {...field('iban')} />
                </Grid>
              </Grid>
            </HrFormSection>

            <HrFormSection title="Medical Information">
              <TextField
                label="Is there any medical condition which might affect your working capability? (if any, kindly describe)"
                multiline
                minRows={2}
                {...field('medicalCondition')}
              />
            </HrFormSection>

            <Alert severity="warning">
              Kindly attach your previous salary slip or any other evidence of your compensation
              from your last company — upload it in your{' '}
              <Link component={RouterLink} href={paths.dashboard.myRecord}>
                E-record
              </Link>
              .
            </Alert>

            <HrFormSection title="Acknowledgment">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                }
                label="I hereby certify that the information provided above is accurate and complete to the best of my knowledge. I understand that any false information provided may result in disciplinary action, up to and including termination of employment."
                sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.25 } }}
              />
              <TextField
                label="Employee signature"
                placeholder="Type your full name to sign"
                value={signatureText}
                onChange={(event) => setSignatureText(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 255 } }}
                fullWidth
              />
            </HrFormSection>

            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" loading={submitting} onClick={onSubmit}>
                {myForm ? 'Update & resubmit' : 'Submit to HR'}
              </Button>
            </Stack>
          </Stack>
        </>
      )}
    </DashboardContent>
  );
}
