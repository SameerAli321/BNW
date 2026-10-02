import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { avatarSrc } from 'src/actions/users';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';

import { AnnouncementBoard } from 'src/sections/announcement/announcement-components';

import { useAuthContext } from 'src/auth/hooks';

import { HrOverviewView } from './hr-overview-view';
import { CeoOverviewView } from './ceo-overview-view';
import { AdminOverviewView } from './admin-overview-view';
import { EmployeeOverviewView } from './employee-overview-view';

// ----------------------------------------------------------------------

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ----------------------------------------------------------------------

// BNW OMS: dashboard home page — same single app/login for everyone (see docs/PROJECT_STATUS.md),
// with the content below the shared welcome banner + announcement board chosen per role: Admin
// (user base and system activity), CEO (letters / appraisals awaiting them, company snapshot), HR
// (the HR work queue, requests over time, who's away, hiring), and everyone else — EMPLOYEE,
// MANAGER, PAYROLL — the personal view (leave balance, own requests, hours logged, letters to
// sign). Line managers also get a "My team" block. All figures come from GET /dashboard.
//
// No logo/company-name repeated here — the sidebar already carries a big, prominent one (see
// layout.tsx); showing it again on every dashboard page just duplicated it (the wordmark image
// already renders "BNW CHARTERED ACCOUNTANTS" as part of the artwork, so a second Typography
// label next to it was showing the company name twice — same mistake fixed in the sidebar).
export function BnwOverviewView() {
  const { user } = useAuthContext();

  const renderRoleContent = () => {
    if (!user) return null;
    switch (user.role) {
      case 'ADMIN':
        return <AdminOverviewView />;
      case 'CEO':
        return <CeoOverviewView />;
      case 'HR':
        return <HrOverviewView />;
      default:
        return <EmployeeOverviewView userId={user.id} />;
    }
  };

  return (
    <DashboardContent>
      <Box
        sx={(theme) => ({
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'primary.lighter',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.16)}, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.04)})`,
        })}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={2.5}>
            <Avatar
              src={avatarSrc(user?.avatarUrl)}
              alt={user?.firstName}
              sx={{
                width: 72,
                height: 72,
                fontSize: 28,
                display: { xs: 'none', sm: 'flex' },
                border: (theme) => `3px solid ${theme.vars.palette.background.paper}`,
                boxShadow: (theme) => theme.vars.customShadows.z8,
              }}
            >
              {user?.firstName?.charAt(0).toUpperCase()}
            </Avatar>
            <Stack spacing={1}>
              {user?.role && (
                <Label color="primary" variant="soft" sx={{ alignSelf: 'flex-start' }}>
                  {user.role}
                </Label>
              )}
              <Typography variant="h4">
                {greeting(new Date().getHours())}, {user?.firstName ?? user?.displayName ?? 'there'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Here&apos;s what&apos;s happening across BNW Chartered Accountants today.
              </Typography>
            </Stack>
          </Stack>

          <Typography variant="subtitle2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {fDate(new Date())}
          </Typography>
        </Stack>
      </Box>

      {/* Announcement board — on every role's dashboard, right under the welcome banner. */}
      <AnnouncementBoard />

      {renderRoleContent()}
    </DashboardContent>
  );
}
