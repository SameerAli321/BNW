import type { DashboardSharedBlocks } from './dashboard-widgets';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { useGetDashboard } from 'src/actions/dashboard';

import { DashboardStatCard } from './dashboard-stat-card';
import { DashboardTeamSection } from './dashboard-team-section';
import {
  humanize,
  CardLink,
  statusColor,
  BarChartCard,
  DonutChartCard,
  DashboardLoading,
  MonthlyTrendCard,
  OnLeaveTodayCard,
  PendingActionsCard,
} from './dashboard-widgets';

// ----------------------------------------------------------------------

const CANDIDATE_ORDER = ['NEW', 'SHORTLISTED', 'OFFERED', 'HIRED', 'REJECTED'];

// BNW OMS: HR dashboard home — the HR work queue (leave to approve, complaints, attendance and
// onboarding forms to record), request volume over time, who's away today, headcount and the
// hiring pipeline — plus the shared announcement / quick-action blocks.
export function HrOverviewView({ announcements, quickActions }: DashboardSharedBlocks) {
  const theme = useTheme();
  const { dashboard, dashboardLoading } = useGetDashboard();

  if (dashboardLoading || !dashboard?.company) return <DashboardLoading />;
  const { company, team } = dashboard;
  const { pending } = company;

  const candidates = CANDIDATE_ORDER.map((status) => ({
    status,
    value: company.candidatesByStatus.find((d) => d.label === status)?.value ?? 0,
  }));

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:users-group-rounded-bold"
            total={company.headcount.active}
            label="Active employees"
            caption={`${company.headcount.total} on record`}
            href={paths.dashboard.staffSummary}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:calendar-date-bold"
            total={company.onLeaveToday.length}
            label="On leave today"
            href={paths.dashboard.leaveRequests.root}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:inbox-in-bold"
            total={pending.leaveHr + pending.attendanceHr + pending.onboardingToRecord}
            label="Forms waiting for HR"
            caption="Leave, attendance, onboarding"
            href={paths.dashboard.requestsForms}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:chat-round-dots-bold"
            total={pending.complaintsOpen}
            label="Open complaints"
            href={paths.dashboard.complaints.root}
            color="error"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <MonthlyTrendCard
            title="Requests received"
            subheader="Forms submitted per month (last 6 months)"
            data={company.requestsByMonth}
            type="bar"
            colors={[
              theme.palette.primary.main,
              theme.palette.secondary.main,
              theme.palette.success.main,
            ]}
            height={340}
            emptyLabel="No forms submitted in the last 6 months"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>{announcements}</Grid>
      </Grid>

      {quickActions}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <PendingActionsCard
            title="HR work queue"
            subheader="Waiting on the HR department"
            items={[
              {
                label: 'Leave requests to approve',
                count: pending.leaveHr,
                href: paths.dashboard.leaveRequests.root,
                icon: 'solar:calendar-date-bold',
                color: 'primary',
              },
              {
                label: 'Attendance forms to record',
                count: pending.attendanceHr,
                href: paths.dashboard.attendanceRegularizations.root,
                icon: 'solar:clock-circle-bold',
                color: 'info',
              },
              {
                label: 'Open complaints',
                count: pending.complaintsOpen,
                href: paths.dashboard.complaints.root,
                icon: 'solar:chat-round-dots-bold',
                color: 'error',
              },
              {
                label: 'Onboarding forms to record',
                count: pending.onboardingToRecord,
                href: paths.dashboard.onboardingForms.root,
                icon: 'solar:user-plus-bold',
                color: 'success',
              },
              {
                label: 'Letters with the CEO',
                count: pending.lettersPendingCeo,
                href: paths.dashboard.letters.root,
                icon: 'solar:letter-bold',
                color: 'warning',
              },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <DonutChartCard
            title="Headcount by department"
            data={company.byDepartment}
            humanizeLabels={false}
            totalLabel="Employees"
            action={<CardLink href={paths.dashboard.staffSummary} />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <OnLeaveTodayCard
            items={company.onLeaveToday}
            action={<CardLink href={paths.dashboard.leaveRequests.root} />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <BarChartCard
            title="Leave taken this year"
            subheader="Approved days by leave type"
            horizontal
            distributed
            categories={company.leaveDaysByType.map((d) => d.label)}
            series={[{ name: 'Days', data: company.leaveDaysByType.map((d) => d.value) }]}
            valueSuffix=" d"
            height={280}
            emptyLabel="No approved leave yet this year"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <BarChartCard
            title="Hiring pipeline"
            subheader="Candidates by stage"
            distributed
            categories={candidates.map((c) => humanize(c.status))}
            series={[{ name: 'Candidates', data: candidates.map((c) => c.value) }]}
            colors={candidates.map((c) =>
              c.status === 'NEW' ? theme.palette.grey[500] : statusColor(theme, c.status)
            )}
            height={280}
            action={<CardLink href={paths.dashboard.candidates.root} />}
            emptyLabel="No candidates yet"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <DonutChartCard
            title="Complaints"
            subheader="All time, by status"
            data={company.complaintsByStatus}
            colorMode="status"
            action={<CardLink href={paths.dashboard.complaints.root} />}
            emptyLabel="No complaints submitted"
          />
        </Grid>
      </Grid>

      <MonthlyTrendCard
        title="New joiners"
        subheader="By join date, last 12 months"
        data={company.joinersByMonth}
        colors={[theme.palette.success.main]}
        height={280}
        emptyLabel="No joiners in the last 12 months"
      />

      {team && <DashboardTeamSection team={team} />}
    </Stack>
  );
}
