import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  useGetAttendanceRegularization,
  downloadAttendanceRegularizationPdf,
} from 'src/actions/attendance-regularizations';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormField, HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

import { AttendanceRegularizationStatusLabel } from '../attendance-regularization-status-label';
import {
  HR_DECISION_TEXT,
  HodRecommendationForm,
  AttendanceHrDecisionForm,
} from '../attendance-regularization-actions';

// ----------------------------------------------------------------------

const signedBy = (signature: string | null, signedAt: string | null) =>
  signature ? `${signature}${signedAt ? ` — ${fDate(signedAt)}` : ''}` : null;

/**
 * One attendance regularization, laid out like the paper form. The employee's HOD recommends it
 * here while it's waiting for them; HR / ADMIN then record the outcome. The backend is the real
 * gate on who can view and act.
 */
export function AttendanceRegularizationDetailView() {
  const { id = '' } = useParams();
  const { user } = useAuthContext();
  const { form, formLoading, formError } = useGetAttendanceRegularization(id);
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
          heading="Attendance regularization"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
            {
              name: 'Attendance Regularization',
              href: paths.dashboard.attendanceRegularizations.root,
            },
            { name: 'Not found' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <EmptyContent filled title="Unable to load this form" description="Either it doesn't exist, or you don't have permission to view it." sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  const canRecommend = form.status === 'PENDING_HOD' && !!user?.id && user.id === form.hodId;
  const canDecide =
    ['HR', 'ADMIN'].includes(user?.role ?? '') &&
    (form.status === 'PENDING_HR' || form.status === 'HOD_NOT_RECOMMENDED');

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadAttendanceRegularizationPdf(form.id);
    } catch (error) {
      console.error(error);
      toast.error('Download failed!');
    } finally {
      setDownloading(false);
    }
  };

  const hodRecommendationText =
    form.hodRecommended === null
      ? null
      : form.hodRecommended
        ? 'Recommended'
        : 'Not recommended';

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading="Regularization of attendance"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Attendance Regularization', href: paths.dashboard.attendanceRegularizations.root },
          { name: `#${form.id}` },
        ]}
        action={
          <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
            <AttendanceRegularizationStatusLabel status={form.status} />
            <Button
              variant="outlined"
              loading={downloading}
              startIcon={<Iconify icon="eva:cloud-download-fill" />}
              onClick={onDownload}
            >
              Download form (PDF)
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        <HrFormSection title="Employee">
          <HrFormField label="Employee code" value={form.employeeCode} />
          <HrFormField label="Employee name" value={form.employeeName} />
          <HrFormField label="Designation" value={form.employeeDesignation} />
          <HrFormField label="Department" value={form.employeeDepartment} />
        </HrFormSection>

        <HrFormSection title="Attendance to regularize">
          <HrFormField label="Date" value={fDate(form.attendanceDate)} />
          <HrFormField label="Time arrival" value={form.timeArrival} />
          <HrFormField label="Time departure" value={form.timeDeparture} />
          <HrFormField label="Reasons" value={form.reason} />
          <HrFormField label="Date of submission" value={fDate(form.createdAt)} />
        </HrFormSection>

        <HrFormSection title="Recommendation of the Head of the Department">
          {canRecommend ? (
            <HodRecommendationForm key={form.updatedAt} form={form} />
          ) : (
            <>
              <HrFormField
                label="Head of department"
                value={form.hodName ?? 'No manager on record — sent straight to HR'}
              />
              <HrFormField label="Recommendation" value={hodRecommendationText} />
              <HrFormField label="Remarks" value={form.hodRemarks} />
              <HrFormField
                label="Signature"
                value={signedBy(form.hodSignatureText, form.hodSignedAt)}
              />
            </>
          )}
        </HrFormSection>

        <HrFormSection title="For use by the HRD">
          {canDecide ? (
            <AttendanceHrDecisionForm key={form.updatedAt} form={form} />
          ) : (
            <>
              <HrFormField
                label="Outcome"
                value={form.hrDecision ? HR_DECISION_TEXT[form.hrDecision] : null}
              />
              <HrFormField label="Remarks" value={form.hrRemarks} />
              <HrFormField
                label="Human Resource Department"
                value={signedBy(form.hrSignatureText, form.hrSignedAt)}
              />
            </>
          )}
        </HrFormSection>
      </Stack>
    </DashboardContent>
  );
}
