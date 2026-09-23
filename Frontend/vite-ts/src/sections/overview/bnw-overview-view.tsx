import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Logo } from 'src/components/logo';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type QuickLink = {
  label: string;
  href: string;
  roles: string[];
};

const QUICK_LINKS: QuickLink[] = [
  { label: 'Users', href: paths.dashboard.user.list, roles: ['HR', 'ADMIN'] },
  { label: 'Staff Summary', href: paths.dashboard.staffSummary, roles: ['HR', 'CEO', 'ADMIN'] },
  { label: 'Letters', href: paths.dashboard.letters.root, roles: ['HR', 'CEO', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'PAYROLL'] },
];

// BNW OMS: replaces the minimal-kit's demo "Overview app" dashboard (charts/widgets built on
// fake e-commerce/download data that has nothing to do with this project). This is a plain
// placeholder home screen — real widgets (pending approvals, appraisal reminders, etc.) get added
// module by module per the project guide's roadmap, once those modules exist.
export function BnwOverviewView() {
  const { user } = useAuthContext();

  const links = QUICK_LINKS.filter((link) => user?.role && link.roles.includes(user.role));

  return (
    <DashboardContent maxWidth="lg">
      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Logo isSingle={false} sx={{ width: 140, height: 44 }} />
          <Typography variant="h5" sx={{ color: 'text.secondary' }}>
            {CONFIG.appName}
          </Typography>
        </Stack>

        <Typography variant="h4" sx={{ mb: 3 }}>
          Welcome back, {user?.firstName ?? user?.displayName ?? 'there'} 👋
        </Typography>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              BNW OMS
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Auth, User Management, E-record, Staff Summary and the Letter Engine are live. Later
              sprints (Appraisals, Leave, Work Orders, Attendance) will add their own dashboard
              widgets here.
            </Typography>

            {links.length > 0 && (
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {links.map((link) => (
                  <Button
                    key={link.href}
                    component={RouterLink}
                    href={link.href}
                    variant="contained"
                  >
                    Go to {link.label}
                  </Button>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </DashboardContent>
  );
}
