import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

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
  DonutChartCard,
  DashboardLoading,
  MonthlyTrendCard,
  OnLeaveTodayCard,
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
// a company snapshot (headcount by department, joiners, who's away) and how letters and appraisals
// are moving through their flows.
export function CeoOverviewView() {
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
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Letters awaiting your review"
              action={<CardLink href={paths.dashboard.letters.root} />}
            />
            <CardContent sx={{ pt: 2 }}>
              {!lettersLoading && letters.length === 0 && (
                <EmptyContent
                  title="Nothing pending"
                  description="Letters HR submits for your review / signature will show up here."
                  sx={{ py: 5 }}
                />
              )}
              <Stack spacing={1.5}>
                {letters.map((letter) => (
                  <Stack
                    key={letter.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    component={RouterLink}
                    href={paths.dashboard.letters.details(letter.id)}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      textDecoration: 'none',
                      color: 'text.primary',
                      border: `1px solid ${theme.vars.palette.divider}`,
                      transition: theme.transitions.create(['background-color', 'transform']),
                      '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-1px)' },
                    }}
                  >
                    <ListItemText
                      primary={`${letter.templateName} — ${letter.subjectName}`}
                      secondary={`Prepared by ${letter.preparedByName}`}
                    />
                    <Label color="info">Review</Label>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <DonutChartCard
            title="Headcount by department"
            data={company.byDepartment}
            humanizeLabels={false}
            totalLabel="Employees"
            action={<CardLink href={paths.dashboard.staffSummary} />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
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
        <Grid size={{ xs: 12, md: 5 }}>
          <DonutChartCard
            title="Appraisal outcomes"
            subheader="All appraisal requests"
            data={company.appraisalsByStatus}
            colorMode="status"
            action={<CardLink href={paths.dashboard.appraisals.root} />}
            emptyLabel="No appraisals yet"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <MonthlyTrendCard
            title="Requests received"
            subheader="Forms submitted per month (last 6 months)"
            data={company.requestsByMonth}
            colors={[theme.palette.primary.main, theme.palette.error.main, theme.palette.info.main]}
            height={320}
            emptyLabel="No forms submitted in the last 6 months"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <OnLeaveTodayCard items={company.onLeaveToday} />
        </Grid>
      </Grid>

      <MonthlyTrendCard
        title="New joiners"
        subheader="By join date, last 12 months"
        data={company.joinersByMonth}
        type="bar"
        colors={[theme.palette.success.main]}
        height={260}
        emptyLabel="No joiners in the last 12 months"
      />

      {team && <DashboardTeamSection team={team} />}
    </Stack>
  );
}
