import type { IUserItem } from 'src/types/user';

import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeProfileForm } from 'src/sections/employee-profile/employee-profile-form';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { UserNewEditForm } from '../user-new-edit-form';

// ----------------------------------------------------------------------

type Props = {
  user?: IUserItem;
};

export function UserEditView({ user: currentUser }: Props) {
  const { user } = useAuthContext();

  const fullName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '';

  return (
    <RoleBasedGuard hasContent currentRole={user?.role ?? ''} allowedRoles={['HR', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Edit"
          backHref={paths.dashboard.user.list}
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Users', href: paths.dashboard.user.list },
            { name: fullName },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Stack spacing={3}>
          <UserNewEditForm currentUser={currentUser} />

          {/* Gap-fix — Personal details (see docs/API_CONTRACT_GAPS_FIX.md Gap 1). Only shown in
              edit mode: the profile is keyed off an existing user id, so it has nowhere to save
              to until the user itself has been created. */}
          {currentUser && (
            <EmployeeProfileForm
              userId={currentUser.id}
              title="Personal details"
              subheader="HR/Admin can view and edit this employee's personal details here."
            />
          )}
        </Stack>
      </DashboardContent>
    </RoleBasedGuard>
  );
}
