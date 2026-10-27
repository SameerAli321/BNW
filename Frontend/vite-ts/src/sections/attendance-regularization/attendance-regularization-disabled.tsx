import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { ATTENDANCE_DISABLED_MESSAGE } from 'src/features';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

/** Shown on every Attendance Regularization page while the section is switched off. */
export function AttendanceRegularizationDisabled() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Attendance Regularization"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Attendance Regularization' },
        ]}
        sx={{ mb: 3 }}
      />
      <Card sx={{ p: 5, textAlign: 'center', bgcolor: 'background.neutral' }}>
        <Iconify icon="solar:clock-circle-bold" width={56} sx={{ color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
          Attendance Regularization is not available yet
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {ATTENDANCE_DISABLED_MESSAGE}
        </Typography>
        <Button
          component={RouterLink}
          href={paths.dashboard.requestsForms}
          variant="outlined"
          color="inherit"
        >
          Back to Requests & Forms
        </Button>
      </Card>
    </DashboardContent>
  );
}
