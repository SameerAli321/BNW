import type { TeamDashboard } from 'src/actions/dashboard';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardStatCard } from './dashboard-stat-card';
import { CardLink, OnLeaveTodayCard, PendingActionsCard } from './dashboard-widgets';

// ----------------------------------------------------------------------

/** "My team" block — shown on any dashboard whose user has direct reports. */
export function DashboardTeamSection({ team }: { team: TeamDashboard }) {
  return (
    <>
      <Typography variant="overline" sx={{ display: 'block', color: 'text.disabled', mt: 2 }}>
        My team
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardStatCard
            icon="solar:users-group-rounded-bold"
            total={team.size}
            label="People reporting to you"
            caption={`${team.onLeaveToday.length} on leave today`}
            color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <PendingActionsCard
            title="Waiting for your approval"
            items={[
              {
                label: 'Leave requests',
                count: team.pendingLeave,
                href: paths.dashboard.leaveRequests.root,
                icon: 'solar:calendar-date-bold',
                color: 'primary',
              },
              {
                label: 'Attendance regularization forms',
                count: team.pendingAttendance,
                href: paths.dashboard.attendanceRegularizations.root,
                icon: 'solar:clock-circle-bold',
                color: 'info',
              },
            ]}
          />
        </Grid>
        {!!team.onLeaveToday.length && (
          <Grid size={{ xs: 12 }}>
            <OnLeaveTodayCard
              title="My team on leave today"
              items={team.onLeaveToday}
              action={<CardLink href={paths.dashboard.leaveRequests.root} />}
            />
          </Grid>
        )}
      </Grid>
    </>
  );
}
