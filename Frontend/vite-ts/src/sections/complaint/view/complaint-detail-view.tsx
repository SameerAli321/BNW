import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetComplaint, downloadComplaintPdf } from 'src/actions/complaints';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormField, HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

import { ComplaintStatusLabel } from '../complaint-status-label';
import { ComplaintHrResponseForm } from '../complaint-hr-response-form';

// ----------------------------------------------------------------------

/**
 * A submitted complaint, laid out like the paper form. HR / ADMIN fill in the "Human Resource
 * Department Only" section here; everyone else sees it read-only. The backend is the real gate on
 * who can view it (complainant or HR / ADMIN / CEO).
 */
export function ComplaintDetailView() {
  const { id = '' } = useParams();
  const { user } = useAuthContext();
  const canRespond = ['HR', 'ADMIN'].includes(user?.role ?? '');

  const { complaint, complaintLoading, complaintError } = useGetComplaint(id);
  const [downloading, setDownloading] = useState(false);

  if (complaintLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (complaintError || !complaint) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Complaint"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
            { name: 'Complaints', href: paths.dashboard.complaints.root },
            { name: 'Not found' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <EmptyContent filled title="Unable to load this complaint" description="Either it doesn't exist, or you don't have permission to view it." sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadComplaintPdf(complaint.id);
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
        heading={`Complaint #${complaint.id}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Complaints', href: paths.dashboard.complaints.root },
          { name: `#${complaint.id}` },
        ]}
        action={
          <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
            <ComplaintStatusLabel status={complaint.status} />
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
        <HrFormSection title="Employee Information">
          <HrFormField label="Name" value={complaint.complainantName} />
          <HrFormField label="Department" value={complaint.complainantDepartment} />
          <HrFormField label="Contact number" value={complaint.contactNumber} />
          <HrFormField label="Email" value={complaint.complainantEmail} />
          <HrFormField label="Date" value={fDate(complaint.createdAt)} />
        </HrFormSection>

        <HrFormSection title="Complaint Details">
          <HrFormField label="Description of complaint" value={complaint.description} />
        </HrFormSection>

        <HrFormSection title="Office Accessories">
          <HrFormField label="Accessory type" value={complaint.accessoryType} />
          <HrFormField label="Description" value={complaint.accessoryDescription} />
          <HrFormField label="Issue" value={complaint.accessoryIssue} />
        </HrFormSection>

        <HrFormSection title="Maintenance Issue">
          <HrFormField label="Area / equipment" value={complaint.maintenanceArea} />
          <HrFormField
            label="Description of issue"
            value={complaint.maintenanceDescription}
          />
        </HrFormSection>

        <HrFormSection title="Human Resource Department Only">
          {canRespond ? (
            // Keyed on updatedAt so the form resets to the saved values after each save.
            <ComplaintHrResponseForm key={complaint.updatedAt} complaint={complaint} />
          ) : (
            <>
              <HrFormField label="Comments" value={complaint.hrComments} />
              <HrFormField label="Action requested" value={complaint.hrActionRequested} />
              <HrFormField
                label="Acknowledgement / receiving"
                value={complaint.hrAcknowledgement}
              />
              <HrFormField
                label="Representative signature"
                value={
                  complaint.hrSignatureText &&
                  `${complaint.hrSignatureText}${
                    complaint.hrSignedAt ? ` — ${fDate(complaint.hrSignedAt)}` : ''
                  }`
                }
              />
            </>
          )}
        </HrFormSection>
      </Stack>
    </DashboardContent>
  );
}
