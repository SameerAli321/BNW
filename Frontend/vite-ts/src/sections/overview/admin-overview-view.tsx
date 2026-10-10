import type { DashboardSharedBlocks } from './dashboard-widgets';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { fPercent } from 'src/utils/format-number';

import { useGetUsers } from 'src/actions/users';
import { useGetDashboard } from 'src/actions/dashboard';
import { useGetLetterTemplates } from 'src/actions/letters';

import { DashboardStatCard } from './dashboard-stat-card';
import { computeUserTrends, DashboardUserOverview } from './dashboard-user-overview';
import {
  CardLink,
  BarChartCard,
  DonutChartCard,
  DashboardLoading,
  MonthlyTrendCard,
  PendingActionsCard,
} from './dashboard-widgets';

// ----------------------------------------------------------------------

// Every user record, for the User overview chart and the 7-day KPI trends. GET /users has no
// upper bound on `limit`; if the firm ever outgrows this the list comes back incomplete
// (meta.total > rows) and the chart / trends hide themselves rather than show wrong numbers.
const ALL_USERS = { limit: 1000 };

// BNW OMS: Admin dashboard home — the user base (KPIs with 7-day trends, a user-history chart, by
// role and department), the shared announcement / quick-action blocks, joiners over time, system
// activity (forms submitted, letters in flight) and a queue of open items across the modules.
export function AdminOverviewView({ announcements, quickActions }: DashboardSharedBlocks) {
  const theme = useTheme();
  const { dashboard, dashboardLoading } = useGetDashboard();
  const { templates } = useGetLetterTemplates();
  const { users, usersMeta, usersLoading } = useGetUsers(ALL_USERS);

  if (dashboardLoading || !dashboard?.company) return <DashboardLoading />;
  const { company } = dashboard;
  const { total, active, inactive } = company.headcount;
  const activeTemplates = templates.filter((t) => t.isActive).length;

  const usersComplete = !!usersMeta && usersMeta.total <= users.length;
  const trends = computeUserTrends(users, usersComplete);
  const shareOfAll = (value: number) =>
    total ? `${fPercent((value / total) * 100)} of all users` : undefined;

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:users-group-rounded-bold"
            total={total}
            label="Total users"
            caption={trends ? `${trends.newThisWeek} new this week` : `${inactive} removed`}
            trend={trends?.totalTrend}
            href={paths.dashboard.user.list}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:shield-check-bold"
            total={active}
            label="Active"
            caption={shareOfAll(active)}
            trend={trends?.activeTrend}
            href={paths.dashboard.user.list}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:forbidden-circle-bold"
            total={inactive}
            label="Removed"
            caption={shareOfAll(inactive)}
            href={paths.dashboard.user.list}
            color="error"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:file-text-bold"
            total={activeTemplates}
            label="Active letter templates"
            caption={`${templates.length} configured`}
            href={paths.dashboard.letterTemplates.root}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <DashboardUserOverview users={users} loading={usersLoading} complete={usersComplete} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>{announcements}</Grid>
      </Grid>

      {quickActions}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <DonutChartCard
            title="Users by role"
            data={company.byRole}
            totalLabel="Users"
            action={<CardLink href={paths.dashboard.user.list} label="Manage" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <BarChartCard
            title="Users by department"
            horizontal
            distributed
            categories={company.byDepartment.map((d) => d.label)}
            series={[{ name: 'Users', data: company.byDepartment.map((d) => d.value) }]}
            height={Math.max(280, company.byDepartment.length * 48 + 60)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <MonthlyTrendCard
            title="New joiners"
            subheader="By join date, last 12 months"
            data={company.joinersByMonth}
            colors={[theme.palette.success.main]}
            height={300}
            emptyLabel="No joiners in the last 12 months"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <DonutChartCard
            title="Letters by status"
            data={company.lettersByStatus}
            colorMode="status"
            totalLabel="Letters"
            action={<CardLink href={paths.dashboard.letters.root} />}
            emptyLabel="No letters yet"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <MonthlyTrendCard
            title="Forms submitted"
            subheader="Per month, last 6 months"
            data={company.requestsByMonth}
            type="bar"
            colors={[
              theme.palette.primary.main,
              theme.palette.secondary.main,
              theme.palette.success.main,
            ]}
            height={320}
            emptyLabel="No forms submitted in the last 6 months"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <PendingActionsCard
            title="Open items"
            subheader="Across all modules"
            items={[
              {
                label: 'Leave requests with HR',
                count: company.pending.leaveHr,
                href: paths.dashboard.leaveRequests.root,
                icon: 'solar:calendar-date-bold',
                color: 'primary',
              },
              {
                label: 'Open complaints',
                count: company.pending.complaintsOpen,
                href: paths.dashboard.complaints.root,
                icon: 'solar:chat-round-dots-bold',
                color: 'error',
              },
              {
                label: 'Attendance forms with HR',
                count: company.pending.attendanceHr,
                href: paths.dashboard.attendanceRegularizations.root,
                icon: 'solar:clock-circle-bold',
                color: 'info',
              },
              {
                label: 'Onboarding forms to record',
                count: company.pending.onboardingToRecord,
                href: paths.dashboard.onboardingForms.root,
                icon: 'solar:user-plus-bold',
                color: 'success',
              },
              {
                label: 'Letters with the CEO',
                count: company.pending.lettersPendingCeo,
                href: paths.dashboard.letters.root,
                icon: 'solar:letter-bold',
                color: 'warning',
              },
            ]}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
