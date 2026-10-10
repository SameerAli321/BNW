import Box from '@mui/material/Box';

import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';

import { HrOverviewView } from './hr-overview-view';
import { CeoOverviewView } from './ceo-overview-view';
import { DashboardWelcome } from './dashboard-welcome';
import { AdminOverviewView } from './admin-overview-view';
import { EmployeeOverviewView } from './employee-overview-view';
import { DashboardAnnouncements } from './dashboard-announcements';
import { DashboardQuickActionsRow } from './dashboard-quick-actions';

// ----------------------------------------------------------------------

// BNW OMS: dashboard home page — same single app/login for everyone (see docs/PROJECT_STATUS.md).
// Every role gets the same frame: welcome banner, a row of KPI cards, the recent-announcements
// card, the quick-actions row, then role-specific charts and lists (each role view decides where
// the shared announcement / quick-action blocks sit in its grid): Admin (user base and system
// activity), CEO (letters / appraisals awaiting them, company snapshot), HR (the HR work queue,
// requests over time, who's away, hiring), and everyone else — EMPLOYEE, MANAGER, PAYROLL — the
// personal view (leave balance, own requests, hours logged, letters to sign). Line managers also
// get a "My team" block. All figures come from GET /dashboard (+ GET /users for the Admin view).
//
// No logo/company-name repeated here — the sidebar already carries a big, prominent one (see
// layout.tsx); showing it again on every dashboard page just duplicated it.
export function BnwOverviewView() {
  const { user } = useAuthContext();

  const renderRoleContent = () => {
    if (!user) return null;
    const shared = {
      announcements: <DashboardAnnouncements />,
      quickActions: <DashboardQuickActionsRow role={user.role} />,
    };
    switch (user.role) {
      case 'ADMIN':
        return <AdminOverviewView {...shared} />;
      case 'CEO':
        return <CeoOverviewView {...shared} />;
      case 'HR':
        return <HrOverviewView {...shared} />;
      default:
        return <EmployeeOverviewView userId={user.id} {...shared} />;
    }
  };

  return (
    <DashboardContent>
      <DashboardWelcome
        name={user?.firstName ?? user?.displayName ?? 'there'}
        role={user?.role}
        avatarUrl={user?.avatarUrl}
      />

      <Box sx={{ mt: 3 }}>{renderRoleContent()}</Box>
    </DashboardContent>
  );
}
