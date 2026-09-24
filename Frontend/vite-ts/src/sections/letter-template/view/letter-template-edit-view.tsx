import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetLetterTemplate } from 'src/actions/letters';

import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { LetterTemplateNewEditForm } from '../letter-template-new-edit-form';

// ----------------------------------------------------------------------

export function LetterTemplateEditView() {
  const { id = '' } = useParams();
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  const { template, templateLoading } = useGetLetterTemplate(id);

  return (
    <RoleBasedGuard hasContent currentRole={currentRole} allowedRoles={['ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Edit letter template"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Letters', href: paths.dashboard.letters.root },
            { name: 'Templates', href: paths.dashboard.letterTemplates.root },
            { name: template?.name || '...' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        {templateLoading && <LoadingScreen />}

        {!templateLoading && template && <LetterTemplateNewEditForm currentTemplate={template} />}
      </DashboardContent>
    </RoleBasedGuard>
  );
}
