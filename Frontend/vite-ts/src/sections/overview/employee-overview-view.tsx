import type { DashboardSharedBlocks } from './dashboard-widgets';

import { useMemo } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { useGetLetters } from 'src/actions/letters';
import { useGetLeaveBalance } from 'src/actions/leave';
import { useGetDashboard } from 'src/actions/dashboard';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';

import { DashboardStatCard } from './dashboard-stat-card';
import { DashboardTeamSection } from './dashboard-team-section';
import {
  dayLabel,
  CardLink,
  BarChartCard,
  DashboardList,
  DonutChartCard,
  DashboardLoading,
  MonthlyTrendCard,
  DashboardListRow,
  DashboardCardHeader,
  LeaveBalanceChartCard,
  DashboardListSkeleton,
} from './dashboard-widgets';

// ----------------------------------------------------------------------

type Props = DashboardSharedBlocks & {
  userId: number;
};

// BNW OMS: the "User" dashboard home (EMPLOYEE / MANAGER / PAYROLL — anyone without a company-wide
// view): leave balance, the shared announcement / quick-action blocks, their own requests, logged
// work hours, and letters waiting on their signature. Line managers also get the "My team" block.
export function EmployeeOverviewView({ userId, announcements, quickActions }: Props) {
  const theme = useTheme();
  const { dashboard, dashboardLoading } = useGetDashboard();
  const { balances } = useGetLeaveBalance(userId);
  const { letters, lettersLoading } = useGetLetters({ status: 'SENT_TO_EMPLOYEE', limit: 5 });

  const leave = useMemo(() => {
    const limited = balances.filter((b) => b.annualQuota !== null);
    return {
      remaining: limited.reduce((sum, b) => sum + (b.remaining ?? 0), 0),
      quota: limited.reduce((sum, b) => sum + (b.annualQuota ?? 0), 0),
    };
  }, [balances]);

  if (dashboardLoading || !dashboard) return <DashboardLoading />;
  const { personal, team } = dashboard;
  const hoursLogged = personal.activityHoursByDay.reduce((sum, d) => sum + d.value, 0);

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:calendar-date-bold"
            total={leave.remaining}
            label="Leave days left"
            caption={`of ${leave.quota} this year`}
            href={paths.dashboard.leaveRequests.root}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:inbox-in-bold"
            total={personal.openRequests}
            label="Open requests"
            caption="Leave, complaints, attendance"
            href={paths.dashboard.requestsForms}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:letter-unread-bold"
            total={personal.lettersToSign}
            label="Letters to sign"
            href={paths.dashboard.letters.root}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:add-folder-bold"
            total={personal.documentsOnFile}
            label="Documents on file"
            caption={
              personal.documentsRequested
                ? `${personal.documentsRequested} requested from you`
                : 'Nothing requested'
            }
            href={paths.dashboard.myRecord}
            color="success"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <LeaveBalanceChartCard
            balances={balances}
            action={<CardLink href={paths.dashboard.leaveRequests.new} label="Apply" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>{announcements}</Grid>
      </Grid>

      {quickActions}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <BarChartCard
            title="Hours logged"
            subheader={`Last 14 days — ${hoursLogged} h in total`}
            categories={personal.activityHoursByDay.map((d) => dayLabel(d.label))}
            series={[{ name: 'Hours', data: personal.activityHoursByDay.map((d) => d.value) }]}
            colors={[theme.palette.info.main]}
            valueSuffix=" h"
            height={280}
            action={<CardLink href={paths.dashboard.activity} label="Log work" />}
            emptyLabel="No work logged in the last 14 days"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <DonutChartCard
            title="Where my time went"
            subheader="Last 30 days"
            data={personal.activityByCategory}
            totalLabel="Hours"
            valueSuffix=" h"
            emptyLabel="No work logged yet"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <DonutChartCard
            title="My requests"
            subheader="Every form you've submitted"
            data={personal.myRequestsByStatus}
            humanizeLabels={false}
            colors={[
              theme.palette.warning.main,
              theme.palette.success.main,
              theme.palette.error.main,
            ]}
            emptyLabel="You haven't submitted any forms yet"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
            <DashboardCardHeader
              title="Letters to sign"
              subheader="Sent to you for e-signing"
              action={<CardLink href={paths.dashboard.letters.root} />}
            />
            {lettersLoading ? (
              <DashboardListSkeleton rows={3} />
            ) : letters.length === 0 ? (
              <EmptyContent
                title="Nothing to sign"
                description="Letters sent to you for e-signing will show up here."
                sx={{ py: 5, flexGrow: 1 }}
                slotProps={{ img: { sx: { maxWidth: 96 } } }}
              />
            ) : (
              <DashboardList>
                {letters.map((letter) => (
                  <DashboardListRow
                    key={letter.id}
                    href={paths.dashboard.letters.details(letter.id)}
                    icon="solar:letter-unread-bold"
                    color="warning"
                    title={letter.templateName}
                    secondary={`Prepared by ${letter.preparedByName}`}
                    meta={
                      <Label color="warning" variant="soft">
                        Sign now
                      </Label>
                    }
                  />
                ))}
              </DashboardList>
            )}
          </Card>
        </Grid>
      </Grid>

      <MonthlyTrendCard
        title="Leave taken"
        subheader="Approved leave days per month"
        data={personal.leaveDaysByMonth}
        type="bar"
        colors={[theme.palette.primary.main]}
        height={280}
        emptyLabel="No approved leave in the last 12 months"
      />

      {team && <DashboardTeamSection team={team} />}
    </Stack>
  );
}
