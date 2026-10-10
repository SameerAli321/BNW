import type { DashboardSharedBlocks } from './dashboard-widgets';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';

import { useGetLetters } from 'src/actions/letters';
import { useGetDashboard } from 'src/actions/dashboard';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';

import { DashboardStatCard } from './dashboard-stat-card';
import { DashboardTeamSection } from './dashboard-team-section';
import {
  humanize,
  CardLink,
  statusColor,
  BarChartCard,
  DashboardList,
  DonutChartCard,
  DashboardLoading,
  MonthlyTrendCard,
  OnLeaveTodayCard,
  DashboardListRow,
  DashboardCardHeader,
  DashboardListSkeleton,
} from './dashboard-widgets';

// ----------------------------------------------------------------------

const LETTER_STATUS_ORDER = [
  'DRAFT',
  'PENDING_CEO',
  'CHANGES_REQUESTED',
  'CEO_SIGNED',
  'SENT_TO_EMPLOYEE',
  'SIGNED',
];

// BNW OMS: CEO dashboard home — what's waiting on the CEO (letters to sign, appraisals to decide),
// the shared announcement / quick-action blocks, a company snapshot (headcount by department,
// joiners, who's away) and how letters and appraisals are moving through their flows.
export function CeoOverviewView({ announcements, quickActions }: DashboardSharedBlocks) {
  const theme = useTheme();
  const { dashboard, dashboardLoading } = useGetDashboard();
  const { letters, lettersLoading } = useGetLetters({ status: 'PENDING_CEO', limit: 5 });

  if (dashboardLoading || !dashboard?.company) return <DashboardLoading />;
  const { company, team } = dashboard;

  const letterStatuses = LETTER_STATUS_ORDER.map((status) => ({
    status,
    value: company.lettersByStatus.find((d) => d.label === status)?.value ?? 0,
  }));

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:letter-unread-bold"
            total={company.pending.lettersPendingCeo}
            label="Letters to sign"
            caption="Waiting for your review"
            href={paths.dashboard.letters.root}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:cup-star-bold"
            total={company.pending.appraisalsPendingCeo}
            label="Appraisals to decide"
            href={paths.dashboard.appraisals.root}
            color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardStatCard
            icon="solar:users-group-rounded-bold"
            total={company.headcount.active}
            label="Employees"
            caption={`${company.byDepartment.length} department(s)`}
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
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
            <DashboardCardHeader
              title="Letters awaiting your review"
              subheader="Submitted by HR for your review / signature"
              action={<CardLink href={paths.dashboard.letters.root} />}
            />
            {lettersLoading ? (
              <DashboardListSkeleton rows={3} />
            ) : letters.length === 0 ? (
              <EmptyContent
                title="Nothing pending"
                description="Letters HR submits for your review / signature will show up here."
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
                    title={`${letter.templateName} — ${letter.subjectName}`}
                    secondary={`Prepared by ${letter.preparedByName}`}
                    meta={
                      <Label color="info" variant="soft">
                        Review
                      </Label>
                    }
                  />
                ))}
              </DashboardList>
            )}
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>{announcements}</Grid>
      </Grid>

      {quickActions}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <DonutChartCard
            title="Headcount by department"
            data={company.byDepartment}
            humanizeLabels={false}
            totalLabel="Employees"
            action={<CardLink href={paths.dashboard.staffSummary} />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <BarChartCard
            title="Letters by status"
            subheader="Company-wide"
            distributed
            categories={letterStatuses.map((l) => humanize(l.status))}
            series={[{ name: 'Letters', data: letterStatuses.map((l) => l.value) }]}
            colors={letterStatuses.map((l) =>
              l.status === 'DRAFT' ? theme.palette.grey[500] : statusColor(theme, l.status)
            )}
            height={320}
            emptyLabel="No letters yet"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <DonutChartCard
            title="Appraisal outcomes"
            subheader="All appraisal requests"
            data={company.appraisalsByStatus}
            colorMode="status"
            action={<CardLink href={paths.dashboard.appraisals.root} />}
            emptyLabel="No appraisals yet"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <MonthlyTrendCard
            title="Requests received"
            subheader="Forms submitted per month (last 6 months)"
            data={company.requestsByMonth}
            colors={[
              theme.palette.primary.main,
              theme.palette.secondary.main,
              theme.palette.success.main,
            ]}
            height={320}
            emptyLabel="No forms submitted in the last 6 months"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <OnLeaveTodayCard items={company.onLeaveToday} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <MonthlyTrendCard
            title="New joiners"
            subheader="By join date, last 12 months"
            data={company.joinersByMonth}
            type="bar"
            colors={[theme.palette.success.main]}
            height={280}
            emptyLabel="No joiners in the last 12 months"
          />
        </Grid>
      </Grid>

      {team && <DashboardTeamSection team={team} />}
    </Stack>
  );
}
