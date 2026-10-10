import type { ReactNode } from 'react';
import type { Theme } from '@mui/material/styles';
import type { IconifyName } from 'src/components/iconify';
import type { PaletteColorKey } from 'src/theme/core/palette';
import type { ChartDatum, MonthlySeries, OnLeaveTodayItem } from 'src/actions/dashboard';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------
// BNW OMS: chart + list widgets shared by the role dashboards (see bnw-overview-view.tsx). The
// data comes from GET /dashboard (actions/dashboard.ts); these only lay it out.

const UPPERCASE_WORDS = new Set(['CEO', 'HR', 'HOD', 'CV']);

/** 'PENDING_CEO' → 'Pending CEO', 'CLIENT_WORK' → 'Client work'. */
export function humanize(value: string): string {
  return value
    .split('_')
    .map((word, index) => {
      if (UPPERCASE_WORDS.has(word)) return word;
      const lower = word.toLowerCase();
      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}

/** '2026-09' → 'Sep 26'. */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const name = new Date(Date.UTC(year, m - 1, 1)).toLocaleString('en', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${name} ${String(year).slice(2)}`;
}

/** '2026-09-15' → '15 Sep'. */
export function dayLabel(day: string): string {
  const [year, m, d] = day.split('-').map(Number);
  const name = new Date(Date.UTC(year, m - 1, d)).toLocaleString('en', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${d} ${name}`;
}

/** Status → a consistent colour (waiting = amber, done = green, refused = red, …). */
export function statusColor(theme: Theme, status: string): string {
  const s = status.toUpperCase();
  if (/(REJECT|NOT_|CANCEL)/.test(s)) return theme.palette.error.main;
  if (/(PENDING|SUBMITTED|REQUESTED|CHANGES)/.test(s)) return theme.palette.warning.main;
  if (/(SIGNED|APPROVED|ACCEPTED|RESOLVED|HIRED|RECORD|ACTIVE)/.test(s))
    return s === 'CEO_SIGNED' ? theme.palette.info.main : theme.palette.success.main;
  if (/(PROGRESS|SENT|SHORTLIST|OFFERED)/.test(s)) return theme.palette.info.main;
  return theme.palette.grey[500];
}

/**
 * A categorical palette for things with no meaning attached (departments, roles, leave types) —
 * brand blue and navy first, then emerald / amber / sky, then lighter tints of the same.
 */
export function categoricalColors(theme: Theme): string[] {
  return [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.primary.light,
    theme.palette.secondary.light,
    theme.palette.success.dark,
  ];
}

const hasValues = (values: number[]) => values.some((value) => value > 0);

// ----------------------------------------------------------------------

/** Turns off skeleton pulses / hover lifts for people who asked for less motion. */
export const reducedMotionSx = {
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transition: 'none',
    transform: 'none',
  },
} as const;

function EmptyChart({ label = 'No data yet', height = 240 }: { label?: string; height?: number }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{ height, px: 3, textAlign: 'center' }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          display: 'flex',
          borderRadius: '50%',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.disabled',
          bgcolor: 'background.neutral',
        }}
      >
        <Iconify icon="solar:chart-square-outline" width={28} />
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}

type HeaderProps = {
  title: string;
  subheader?: ReactNode;
  action?: ReactNode;
  /** Optional tinted icon square before the title. */
  icon?: IconifyName;
};

/**
 * The one card heading every dashboard widget uses: (optional icon), title, optional muted
 * subtitle, and an action (a "View all" link, a status label, a button) on the right. Slightly
 * tighter padding on phones so a 360px screen keeps its content width.
 */
export function DashboardCardHeader({ title, subheader, action, icon }: HeaderProps) {
  return (
    <CardHeader
      title={title}
      subheader={subheader}
      action={action}
      avatar={
        icon ? (
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'flex',
              borderRadius: 1.25,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
            }}
          >
            <Iconify icon={icon} width={22} />
          </Box>
        ) : undefined
      }
      sx={{
        px: { xs: 2.5, md: 3 },
        pt: { xs: 2.5, md: 3 },
        pb: 0,
        '& .MuiCardHeader-content': { minWidth: 0 },
        '& .MuiCardHeader-action': { alignSelf: 'center', m: 0, ml: 1.5 },
      }}
    />
  );
}

type CardShellProps = HeaderProps & {
  children: ReactNode;
};

function ChartCard({ title, subheader, action, children }: CardShellProps) {
  return (
    <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
      <DashboardCardHeader title={title} subheader={subheader} action={action} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {children}
      </Box>
    </Card>
  );
}

/** "View all" style link for a card header. */
export function CardLink({ href, label = 'View all' }: { href: string; label?: string }) {
  return (
    <Button
      component={RouterLink}
      href={href}
      size="small"
      color="primary"
      endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} sx={{ ml: -0.5 }} />}
      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
    >
      {label}
    </Button>
  );
}

// ----------------------------------------------------------------------

type ListRowProps = {
  href: string;
  icon: IconifyName;
  color?: PaletteColorKey;
  title: ReactNode;
  secondary?: ReactNode;
  /** Right-hand side before the chevron — a relative time, a status label, … */
  meta?: ReactNode;
  dimmed?: boolean;
};

/**
 * A linked list row — soft round icon, bold one-line title, one-line muted body, meta on the right
 * and a chevron. Used by the announcement and "letters waiting" cards; DashboardList puts the
 * dividers between rows.
 */
export function DashboardListRow({
  href,
  icon,
  color = 'primary',
  title,
  secondary,
  meta,
  dimmed,
}: ListRowProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      component={RouterLink}
      href={href}
      sx={(theme) => ({
        px: 1,
        py: 1.5,
        borderRadius: 1,
        color: 'text.primary',
        textDecoration: 'none',
        opacity: dimmed ? 0.6 : 1,
        transition: theme.transitions.create('background-color'),
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': {
          outline: `2px solid ${theme.vars.palette.primary.main}`,
          outlineOffset: -2,
        },
        ...reducedMotionSx,
      })}
    >
      <Box
        sx={(theme) => ({
          width: 40,
          height: 40,
          flexShrink: 0,
          display: 'flex',
          borderRadius: '50%',
          alignItems: 'center',
          justifyContent: 'center',
          color: `${color}.main`,
          bgcolor: `${color}.lighter`,
          ...theme.applyStyles('dark', {
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.16),
          }),
        })}
      >
        <Iconify icon={icon} width={20} />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>
          {title}
        </Typography>
        {secondary && (
          <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
            {secondary}
          </Typography>
        )}
      </Box>
      {meta && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{meta}</Box>}
      <Iconify
        icon="eva:arrow-ios-forward-fill"
        width={16}
        sx={{ color: 'text.disabled', flexShrink: 0 }}
      />
    </Stack>
  );
}

/** Wraps DashboardListRow-s with dashed dividers between them. */
export function DashboardList({ children }: { children: ReactNode }) {
  return (
    <Stack
      divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}
      sx={{ px: { xs: 1.5, md: 2 }, py: 1.5 }}
    >
      {children}
    </Stack>
  );
}

/** Placeholder rows while a DashboardList is loading. */
export function DashboardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={2.5} sx={{ px: { xs: 2.5, md: 3 }, py: 2.5 }}>
      {Array.from({ length: rows }, (_, index) => (
        <Stack key={index} direction="row" alignItems="center" spacing={1.5}>
          <Skeleton variant="circular" width={40} height={40} sx={reducedMotionSx} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton width="45%" sx={reducedMotionSx} />
            <Skeleton width="80%" sx={reducedMotionSx} />
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

/** Section heading between groups of cards (e.g. "My team"). */
export function DashboardSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ pt: 1 }}>
      <Typography variant="h6">{title}</Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

type DonutProps = {
  title: string;
  subheader?: string;
  data: ChartDatum[];
  /** 'status' colours by meaning (pending / approved / …); default is a categorical palette. */
  colorMode?: 'status' | 'category';
  /** Fixed colours, one per datum (in order) — overrides colorMode. */
  colors?: string[];
  totalLabel?: string;
  humanizeLabels?: boolean;
  valueSuffix?: string;
  action?: ReactNode;
  emptyLabel?: string;
};

/** Share-of-total donut with the total in the middle and a legend underneath. */
export function DonutChartCard({
  title,
  subheader,
  data,
  colorMode = 'category',
  colors: fixedColors,
  totalLabel = 'Total',
  humanizeLabels = true,
  valueSuffix = '',
  action,
  emptyLabel,
}: DonutProps) {
  const theme = useTheme();
  const indexed = data.map((d, index) => ({ ...d, index }));
  const rows = indexed.filter((d) => d.value > 0);
  const labels = rows.map((d) => (humanizeLabels ? humanize(d.label) : d.label));
  const palette = categoricalColors(theme);
  const colors = rows.map((d) =>
    fixedColors
      ? fixedColors[d.index % fixedColors.length]
      : colorMode === 'status'
        ? statusColor(theme, d.label)
        : palette[d.index % palette.length]
  );
  const format = (value: number) => `${fNumber(value)}${valueSuffix}`;

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    labels,
    colors,
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { y: { formatter: format, title: { formatter: (name: string) => name } } },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            value: { formatter: (value: number | string) => format(Number(value)) },
            total: {
              label: totalLabel,
              formatter: (w: { globals: { seriesTotals: number[] } }) =>
                format(w.globals.seriesTotals.reduce((a, b) => a + b, 0)),
            },
          },
        },
      },
    },
  });

  return (
    <ChartCard title={title} subheader={subheader} action={action}>
      {!rows.length ? (
        <EmptyChart label={emptyLabel} />
      ) : (
        <>
          <Chart
            type="donut"
            series={rows.map((d) => d.value)}
            options={chartOptions}
            sx={{ my: 3, mx: 'auto', width: 220, height: 220 }}
          />
          <Divider sx={{ borderStyle: 'dashed' }} />
          <ChartLegends
            labels={labels}
            colors={colors}
            values={rows.map((d) => format(d.value))}
            sx={{ p: 2.5, justifyContent: 'center' }}
          />
        </>
      )}
    </ChartCard>
  );
}

// ----------------------------------------------------------------------

type BarProps = {
  title: string;
  subheader?: string;
  categories: string[];
  series: { name: string; data: number[] }[];
  colors?: string[];
  horizontal?: boolean;
  stacked?: boolean;
  /** Colour each bar separately (single-series charts only). */
  distributed?: boolean;
  height?: number;
  valueSuffix?: string;
  action?: ReactNode;
  emptyLabel?: string;
};

/** Column / horizontal bar chart — single series, grouped or stacked. */
export function BarChartCard({
  title,
  subheader,
  categories,
  series,
  colors,
  horizontal = false,
  stacked = false,
  distributed = false,
  height = 300,
  valueSuffix = '',
  action,
  emptyLabel,
}: BarProps) {
  const theme = useTheme();
  const multi = series.length > 1;
  const format = (value: number) => `${fNumber(value)}${valueSuffix}`;

  const chartOptions = useChart({
    chart: { stacked },
    colors: colors ?? categoricalColors(theme),
    xaxis: { categories },
    yaxis: horizontal ? {} : { forceNiceScale: true, labels: { formatter: (v: number) => fNumber(v) } },
    legend: { show: multi && !distributed, position: 'top', horizontalAlign: 'right' },
    tooltip: { y: { formatter: format } },
    dataLabels: { enabled: horizontal && !stacked, formatter: (v: number) => format(v), offsetX: 16 },
    plotOptions: {
      bar: {
        horizontal,
        distributed,
        borderRadius: 4,
        columnWidth: multi && !stacked ? '56%' : '36%',
        barHeight: stacked ? '56%' : '44%',
        dataLabels: { position: 'top' },
      },
    },
  });

  const empty = !hasValues(series.flatMap((s) => s.data));

  return (
    <ChartCard title={title} subheader={subheader} action={action}>
      {empty ? (
        <EmptyChart label={emptyLabel} height={height} />
      ) : (
        <Chart
          type="bar"
          series={series}
          options={chartOptions}
          sx={{ height, px: 1.5, pb: 1.5 }}
        />
      )}
    </ChartCard>
  );
}

// ----------------------------------------------------------------------

type AreaProps = {
  title: string;
  subheader?: string;
  data: MonthlySeries;
  colors?: string[];
  height?: number;
  action?: ReactNode;
  emptyLabel?: string;
  type?: 'area' | 'bar';
};

/** Month-by-month trend (one or more series). */
export function MonthlyTrendCard({
  title,
  subheader,
  data,
  colors,
  height = 300,
  action,
  emptyLabel,
  type = 'area',
}: AreaProps) {
  const theme = useTheme();
  const multi = data.series.length > 1;

  const chartOptions = useChart({
    colors: colors ?? categoricalColors(theme),
    xaxis: { categories: data.months.map(monthLabel) },
    yaxis: { forceNiceScale: true, labels: { formatter: (v: number) => fNumber(v) } },
    legend: { show: multi, position: 'top', horizontalAlign: 'right' },
    tooltip: { y: { formatter: (v: number) => fNumber(v) } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: multi ? '56%' : '36%' } },
  });

  const empty = !hasValues(data.series.flatMap((s) => s.data));

  return (
    <ChartCard title={title} subheader={subheader} action={action}>
      {empty ? (
        <EmptyChart label={emptyLabel} height={height} />
      ) : (
        <Chart type={type} series={data.series} options={chartOptions} sx={{ height, px: 1.5, pb: 1.5 }} />
      )}
    </ChartCard>
  );
}

// ----------------------------------------------------------------------

export type PendingItem = {
  label: string;
  count: number;
  href: string;
  icon: IconifyName;
  color: PaletteColorKey;
};

/** "Waiting on you" checklist — each row links to the list where the work is done. */
export function PendingActionsCard({
  title,
  subheader,
  items,
}: {
  title: string;
  subheader?: string;
  items: PendingItem[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card sx={{ height: 1 }}>
      <DashboardCardHeader
        title={title}
        subheader={subheader}
        action={
          <Label color={total ? 'warning' : 'success'} variant="soft">
            {total ? `${total} waiting` : 'All clear'}
          </Label>
        }
      />
      <Stack spacing={0.5} sx={{ p: { xs: 1.5, md: 2 } }}>
        {items.map((item) => (
          <Stack
            key={item.label}
            direction="row"
            alignItems="center"
            spacing={1.5}
            component={RouterLink}
            href={item.href}
            sx={(theme) => ({
              p: 1,
              borderRadius: 1,
              color: 'text.primary',
              textDecoration: 'none',
              opacity: item.count ? 1 : 0.6,
              transition: theme.transitions.create('background-color'),
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus-visible': {
                outline: `2px solid ${theme.vars.palette.primary.main}`,
                outlineOffset: -2,
              },
              ...reducedMotionSx,
            })}
          >
            <Box
              sx={(theme) => ({
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: `${item.color}.main`,
                bgcolor: `${item.color}.lighter`,
                ...theme.applyStyles('dark', {
                  bgcolor: varAlpha(theme.vars.palette[item.color].mainChannel, 0.16),
                }),
              })}
            >
              <Iconify icon={item.icon} width={20} />
            </Box>
            <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
              {item.label}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ color: item.count ? `${item.color}.main` : 'text.disabled' }}
            >
              {item.count}
            </Typography>
            <Iconify
              icon="eva:arrow-ios-forward-fill"
              width={16}
              sx={{ color: 'text.disabled', flexShrink: 0 }}
            />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

/** Who is away today (approved leave covering today). */
export function OnLeaveTodayCard({
  title = 'On leave today',
  items,
  action,
}: {
  title?: string;
  items: OnLeaveTodayItem[];
  action?: ReactNode;
}) {
  return (
    <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
      <DashboardCardHeader
        title={title}
        subheader={items.length ? `${items.length} away` : undefined}
        action={action}
      />
      {!items.length ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{ flexGrow: 1, py: 5, px: 3, textAlign: 'center' }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'success.main',
              bgcolor: 'success.lighter',
            }}
          >
            <Iconify icon="solar:users-group-rounded-bold-duotone" width={28} />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Everyone is in today
          </Typography>
        </Stack>
      ) : (
        <Stack
          divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}
          sx={{ px: { xs: 2.5, md: 3 }, py: 1.5 }}
        >
          {items.slice(0, 6).map((item) => (
            <Stack
              key={`${item.employeeId}-${item.endDate}`}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ py: 1.25 }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  typography: 'subtitle2',
                  bgcolor: 'primary.lighter',
                  color: 'primary.dark',
                }}
              >
                {item.employeeName.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {item.employeeName}
                </Typography>
                <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
                  {item.leaveTypeName}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                until {fDate(item.endDate)}
              </Typography>
            </Stack>
          ))}
          {items.length > 6 && (
            <Typography
              variant="caption"
              sx={{ py: 1.25, color: 'text.secondary', textAlign: 'center' }}
            >
              +{items.length - 6} more
            </Typography>
          )}
        </Stack>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

/** Remaining / pending / taken per leave type as one stacked horizontal bar each. */
export function LeaveBalanceChartCard({
  balances,
  action,
}: {
  balances: {
    leaveTypeName: string;
    annualQuota: number | null;
    used: number;
    pending: number;
    remaining: number | null;
  }[];
  action?: ReactNode;
}) {
  const theme = useTheme();
  const limited = balances.filter((b) => b.annualQuota !== null);
  return (
    <BarChartCard
      title="My leave balance"
      subheader={`${new Date().getFullYear()} — days per leave type`}
      horizontal
      stacked
      height={Math.max(200, limited.length * 64 + 60)}
      categories={limited.map((b) => b.leaveTypeName)}
      series={[
        { name: 'Taken', data: limited.map((b) => b.used) },
        { name: 'Pending', data: limited.map((b) => b.pending) },
        { name: 'Remaining', data: limited.map((b) => b.remaining ?? 0) },
      ]}
      colors={[
        theme.palette.primary.main,
        theme.palette.warning.main,
        alpha(theme.palette.grey[500], 0.24),
      ]}
      valueSuffix=" d"
      action={action}
      emptyLabel="No leave types set up yet"
    />
  );
}

// ----------------------------------------------------------------------

/** The shared blocks every role view places in its grid (built once in bnw-overview-view.tsx). */
export type DashboardSharedBlocks = {
  announcements?: ReactNode;
  quickActions?: ReactNode;
};

// ----------------------------------------------------------------------

/**
 * Placeholder for a role dashboard while GET /dashboard loads — the same shape as the real page
 * (a row of KPI cards, then two chart cards) so nothing jumps when the data lands.
 */
export function DashboardLoading() {
  return (
    <Stack spacing={3} aria-busy="true" aria-label="Loading dashboard">
      <Grid container spacing={3}>
        {[0, 1, 2, 3].map((index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="rounded" width={48} height={48} sx={reducedMotionSx} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton width="40%" height={36} sx={reducedMotionSx} />
                <Skeleton width="75%" sx={reducedMotionSx} />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        {[8, 4].map((md) => (
          <Grid key={md} size={{ xs: 12, md }}>
            <Card sx={{ p: { xs: 2.5, md: 3 } }}>
              <Skeleton width="35%" height={28} sx={reducedMotionSx} />
              <Skeleton width="55%" sx={reducedMotionSx} />
              <Skeleton variant="rounded" height={240} sx={{ mt: 2.5, ...reducedMotionSx }} />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
