import type { Dayjs } from 'dayjs';
import type { UserDto } from 'src/types/user';

import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { EmptyContent } from 'src/components/empty-content';
import { Chart, useChart, ChartSelect, ChartLegends } from 'src/components/chart';

import { reducedMotionSx, DashboardCardHeader } from './dashboard-widgets';

// ----------------------------------------------------------------------
// BNW OMS: user history for the Admin dashboard, derived from the GET /users records (the same
// non-deleted users the KPI headcount counts). The API keeps no status history, so per day:
//   Total  = users whose `createdAt` is on or before that day;
//   Active = of those, users ACTIVE today — plus INACTIVE users whose `leavingDate` is after
//            that day (they were still with the firm then). INACTIVE users with no leaving date
//            are counted inactive throughout, since when they left isn't recorded.

const endOfDay = (offsetDays: number) => dayjs().subtract(offsetDays, 'day').endOf('day');

function existedOn(user: UserDto, day: Dayjs) {
  return !dayjs(user.createdAt).isAfter(day);
}

function activeOn(user: UserDto, day: Dayjs) {
  if (!existedOn(user, day)) return false;
  if (user.status === 'ACTIVE') return true;
  // Left between that day and today (a leaving date still in the future doesn't count — the
  // status is the source of truth for today).
  return (
    !!user.leavingDate &&
    dayjs(user.leavingDate).isAfter(day, 'day') &&
    !dayjs(user.leavingDate).isAfter(endOfDay(0), 'day')
  );
}

const pctChange = (now: number, before: number) =>
  before > 0 ? ((now - before) / before) * 100 : null;

export type UserTrends = {
  newThisWeek: number;
  /** % change vs. 7 days ago; null when there was nothing to compare against. */
  totalTrend: number | null;
  activeTrend: number | null;
};

/** 7-day KPI trends from the user records; null if the list isn't complete. */
export function computeUserTrends(users: UserDto[], complete: boolean): UserTrends | null {
  if (!complete || !users.length) return null;
  const today = endOfDay(0);
  const weekAgo = endOfDay(7);
  const totalNow = users.filter((u) => existedOn(u, today)).length;
  const totalBefore = users.filter((u) => existedOn(u, weekAgo)).length;
  const activeNow = users.filter((u) => activeOn(u, today)).length;
  const activeBefore = users.filter((u) => activeOn(u, weekAgo)).length;
  return {
    newThisWeek: totalNow - totalBefore,
    totalTrend: pctChange(totalNow, totalBefore),
    activeTrend: pctChange(activeNow, activeBefore),
  };
}

// ----------------------------------------------------------------------

const RANGES = ['Last 7 days', 'Last 30 days'];

type Props = {
  users: UserDto[];
  loading: boolean;
  /** False when GET /users returned fewer rows than exist — the history would be wrong. */
  complete: boolean;
};

export function DashboardUserOverview({ users, loading, complete }: Props) {
  const theme = useTheme();
  const [range, setRange] = useState(RANGES[0]);
  const days = range === RANGES[0] ? 7 : 30;

  const history = useMemo(() => {
    const dates = Array.from({ length: days }, (_, index) => endOfDay(days - 1 - index));
    return {
      categories: dates.map((d) => d.format('DD MMM')),
      total: dates.map((d) => users.filter((u) => existedOn(u, d)).length),
      active: dates.map((d) => users.filter((u) => activeOn(u, d)).length),
    };
  }, [users, days]);

  const colors = [theme.palette.primary.main, theme.palette.success.main];
  const series = [
    { name: 'Total users', data: history.total },
    { name: 'Active users', data: history.active },
  ];

  const chartOptions = useChart({
    colors,
    fill: { type: 'gradient', gradient: { opacityFrom: 0.24, opacityTo: 0 } },
    xaxis: {
      categories: history.categories,
      labels: { rotate: 0, hideOverlappingLabels: true },
      tickAmount: days === 7 ? undefined : 6,
    },
    yaxis: { forceNiceScale: true, labels: { formatter: (v: number) => fNumber(v) } },
    tooltip: { y: { formatter: (v: number) => fNumber(v) } },
  });

  const noHistory = !loading && (!complete || !users.length);

  return (
    <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
      <DashboardCardHeader
        title="User overview"
        subheader={`Total users and active users over the last ${days} days`}
        action={<ChartSelect options={RANGES} value={range} onChange={setRange} />}
      />

      {loading ? (
        <Box sx={{ p: { xs: 2.5, md: 3 }, flexGrow: 1 }}>
          <Skeleton variant="rounded" height={280} sx={reducedMotionSx} />
        </Box>
      ) : noHistory ? (
        <EmptyContent
          title="Not enough history yet"
          description="The chart fills in as users are added."
          sx={{ py: 6, flexGrow: 1 }}
          slotProps={{ img: { sx: { maxWidth: 96 } } }}
        />
      ) : (
        <>
          <Chart
            type="area"
            series={series}
            options={chartOptions}
            sx={{ pl: 1, pr: 2.5, pt: 2, height: 300, flexGrow: 1 }}
          />
          <Divider sx={{ borderStyle: 'dashed' }} />
          <ChartLegends
            labels={series.map((s) => s.name)}
            colors={colors}
            values={series.map((s) => fNumber(s.data[s.data.length - 1]))}
            sx={{ p: 2, gap: 3, justifyContent: 'center' }}
          />
        </>
      )}
    </Card>
  );
}
