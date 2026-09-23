import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { LetterTemplateNewEditForm } from '../letter-template-new-edit-form';

// ----------------------------------------------------------------------

export function LetterTemplateCreateView() {
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  return (
    <RoleBasedGuard hasContent currentRole={currentRole} allowedRoles={['ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="New letter template"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Letters', href: paths.dashboard.letters.root },
            { name: 'Templates', href: paths.dashboard.letterTemplates.root },
            { name: 'New' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <LetterTemplateNewEditForm />
      </DashboardContent>
    </RoleBasedGuard>
  );
}
