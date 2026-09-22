import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

// BNW OMS: replaces the minimal-kit's demo "Overview app" dashboard (charts/widgets built on
// fake e-commerce/download data that has nothing to do with this project). This is a plain
// placeholder home screen — real widgets (staff summary, pending approvals, etc.) get added
// module by module per the project guide's roadmap, once those modules exist.
export function BnwOverviewView() {
  const { user } = useAuthContext();

  const canManageUsers = user?.role === 'HR' || user?.role === 'ADMIN';

  return (
    <DashboardContent maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        Welcome back, {user?.firstName ?? user?.displayName ?? 'there'} 👋
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            BNW OMS — Sprint 1
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Auth and User Management are live. Later sprints (E-record, Letters, Appraisals,
            Leave, Work Orders, Attendance) will add their own dashboard widgets here.
          </Typography>

          {canManageUsers && (
            <Button component={RouterLink} href={paths.dashboard.user.list} variant="contained">
              Go to Users
            </Button>
          )}
        </CardContent>
      </Card>
    </DashboardContent>
  );
}
