import type { IUserItem } from 'src/types/user';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

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

        <UserNewEditForm currentUser={currentUser} />
      </DashboardContent>
    </RoleBasedGuard>
  );
}
