import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';

import { useAuthContext } from 'src/auth/hooks';

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
// but the content below the shared welcome banner is chosen per role, per explicit user request:
// a User-facing view (own letters to sign, own E-record), an Admin view (user/template counts),
// and a CEO view (letters awaiting their sign-off, company-wide staff count). HR, MANAGER and
// PAYROLL fall back to the Employee-style "my stuff" view for now — they weren't part of the
// specific 3-dashboard request, and "my own letters/E-record" is a reasonable default for any
// role that isn't Admin or CEO. Revisit if HR/Manager get their own tailored view later.
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
      default:
        return <EmployeeOverviewView userId={user.id} />;
    }
  };

  return (
    <DashboardContent maxWidth="lg">
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

          <Typography variant="subtitle2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {fDate(new Date())}
          </Typography>
        </Stack>
      </Box>

      {renderRoleContent()}
    </DashboardContent>
  );
}
