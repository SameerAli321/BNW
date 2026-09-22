import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { UserNewEditForm } from '../user-new-edit-form';

// ----------------------------------------------------------------------

export function UserCreateView() {
  const { user } = useAuthContext();

  return (
    <RoleBasedGuard hasContent currentRole={user?.role ?? ''} allowedRoles={['HR', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Create a new user"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Users', href: paths.dashboard.user.list },
            { name: 'New user' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <UserNewEditForm />
      </DashboardContent>
    </RoleBasedGuard>
  );
}
