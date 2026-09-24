import { useBoolean } from 'minimal-shared/hooks';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetDocumentTypes, useGetEmployeeRecord } from 'src/actions/employee-records';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { EmployeeDocumentTable } from '../employee-document-table';
import { EmployeeRecordBasicInfo } from '../employee-record-basic-info';
import { EmployeeDocumentRequestTable } from '../employee-document-request-table';
import { EmployeeDocumentUploadDialog } from '../employee-document-upload-dialog';
import { EmployeeDocumentRequestDialog } from '../employee-document-request-dialog';

// ----------------------------------------------------------------------

/**
 * Employee E-record — U5 (see docs/API_CONTRACT_SPRINT2.md). Reachable from a Staff Summary row
 * (HR/CEO/ADMIN) or from a user's own account area (see src/sections/account/account-layout.tsx).
 *
 * Client-side access check mirrors the contract's allowed-caller list (HR, ADMIN, CEO, self,
 * manager-of) as closely as a pure frontend check can: HR/ADMIN/CEO and the record's own owner
 * are always let through; MANAGER is let through too since "manager-of" can only be confirmed by
 * the backend (it 403s otherwise — see the error state below). Anyone else (EMPLOYEE/PAYROLL
 * viewing someone else's id) is blocked immediately, same "Permission denied" pattern as the
 * Users module's `RoleBasedGuard`.
 */
export function EmployeeRecordView() {
  const { id = '' } = useParams();
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  const isSelf = !!currentAuthUser && String(currentAuthUser.id) === String(id);
  const isPrivileged = ['HR', 'ADMIN', 'CEO'].includes(currentRole);
  const mayAttempt = isSelf || isPrivileged || currentRole === 'MANAGER';

  const canManage = ['HR', 'ADMIN'].includes(currentRole);

  const uploadDialog = useBoolean();
  const requestDialog = useBoolean();

  const { record, recordLoading, recordError } = useGetEmployeeRecord(mayAttempt ? id : undefined);
  const { documentTypes } = useGetDocumentTypes();

  return (
    <RoleBasedGuard
      hasContent
      currentRole={mayAttempt ? 'ALLOWED' : 'BLOCKED'}
      allowedRoles={['ALLOWED']}
    >
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Employee E-record"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            ...(isPrivileged
              ? [{ name: 'Staff Summary', href: paths.dashboard.staffSummary }]
              : []),
            { name: 'E-record' },
          ]}
          action={
            canManage &&
            record && (
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="custom:send-fill" />}
                  onClick={requestDialog.onTrue}
                >
                  Request document
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                  onClick={uploadDialog.onTrue}
                >
                  Upload document
                </Button>
              </Stack>
            )
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        {recordLoading && <LoadingScreen />}

        {!recordLoading && recordError && (
          <Stack sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
            Unable to load this employee&apos;s record — either it doesn&apos;t exist, or you
            don&apos;t have permission to view it.
          </Stack>
        )}

        {!recordLoading && record && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <EmployeeRecordBasicInfo user={record.user} />
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                <EmployeeDocumentTable documents={record.documents} />
                <EmployeeDocumentRequestTable requests={record.documentRequests} />
              </Stack>
            </Grid>
          </Grid>
        )}
      </DashboardContent>

      {canManage && record && (
        <>
          <EmployeeDocumentUploadDialog
            open={uploadDialog.value}
            onClose={uploadDialog.onFalse}
            userId={id}
            documentTypes={documentTypes}
          />
          <EmployeeDocumentRequestDialog
            open={requestDialog.value}
            onClose={requestDialog.onFalse}
            userId={id}
            documentTypes={documentTypes}
          />
        </>
      )}
    </RoleBasedGuard>
  );
}
