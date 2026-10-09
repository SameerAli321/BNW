import type { ReactNode } from 'react';
import type { Theme } from '@mui/material/styles';
import type { IconifyName } from 'src/components/iconify';
import type { PaletteColorKey } from 'src/theme/core/palette';
import type { ChartDatum, MonthlySeries, OnLeaveTodayItem } from 'src/actions/dashboard';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

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

/** A categorical palette for things with no meaning attached (departments, roles, leave types). */
export function categoricalColors(theme: Theme): string[] {
  return [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
    theme.palette.primary.dark,
    theme.palette.info.dark,
  ];
}

const hasValues = (values: number[]) => values.some((value) => value > 0);

// ----------------------------------------------------------------------

function EmptyChart({ label = 'No data yet', height = 240 }: { label?: string; height?: number }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height, color: 'text.disabled' }}>
      <Iconify icon="solar:chart-square-outline" width={40} />
      <Typography variant="body2">{label}</Typography>
    </Stack>
  );
}

type CardShellProps = {
  title: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
};

function ChartCard({ title, subheader, action, children }: CardShellProps) {
  return (
    <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
      <CardHeader title={title} subheader={subheader} action={action} />
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
      color="inherit"
      endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
    >
      {label}
    </Button>
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
export function PendingActionsCard({ title, subheader, items }: { title: string; subheader?: string; items: PendingItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card sx={{ height: 1 }}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <Label color={total ? 'warning' : 'success'} variant="soft">
            {total ? `${total} waiting` : 'All clear'}
          </Label>
        }
      />
      <Stack spacing={1} sx={{ p: 2 }}>
        {items.map((item) => (
          <Stack
            key={item.label}
            direction="row"
            alignItems="center"
            spacing={1.5}
            component={RouterLink}
            href={item.href}
            sx={{
              p: 1.25,
              borderRadius: 1.25,
              color: 'text.primary',
              textDecoration: 'none',
              opacity: item.count ? 1 : 0.6,
              transition: (theme) => theme.transitions.create('background-color'),
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: `${item.color}.main`,
                bgcolor: (theme) => varAlpha(theme.vars.palette[item.color].mainChannel, 0.12),
              }}
            >
              <Iconify icon={item.icon} width={20} />
            </Box>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {item.label}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: item.count ? `${item.color}.main` : 'text.disabled' }}>
              {item.count}
            </Typography>
            <Iconify icon="eva:arrow-ios-forward-fill" width={16} sx={{ color: 'text.disabled' }} />
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
    <Card sx={{ height: 1 }}>
      <CardHeader
        title={title}
        subheader={items.length ? `${items.length} away` : undefined}
        action={action}
      />
      <Stack spacing={1.5} sx={{ p: 2.5, pt: 2 }}>
        {!items.length && (
          <Stack alignItems="center" spacing={1} sx={{ py: 4, color: 'text.disabled' }}>
            <Iconify icon="solar:users-group-rounded-bold-duotone" width={40} />
            <Typography variant="body2">Everyone is in today</Typography>
          </Stack>
        )}
        {items.slice(0, 6).map((item) => (
          <Stack key={`${item.employeeId}-${item.endDate}`} direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ width: 36, height: 36, typography: 'subtitle2', bgcolor: 'primary.lighter', color: 'primary.dark' }}>
              {item.employeeName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {item.employeeName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {item.leaveTypeName}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
              until {fDate(item.endDate)}
            </Typography>
          </Stack>
        ))}
        {items.length > 6 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            +{items.length - 6} more
          </Typography>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

/** Remaining / pending / taken per leave type as one stacked horizontal bar each. */
export function LeaveBalanceChartCard({
  balances,
  action,
}: {
  balances: { leaveTypeName: string; annualQuota: number | null; used: number; pending: number; remaining: number | null }[];
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
      colors={[theme.palette.primary.main, theme.palette.warning.main, alpha(theme.palette.grey[500], 0.24)]}
      valueSuffix=" d"
      action={action}
      emptyLabel="No leave types set up yet"
    />
  );
}

// ----------------------------------------------------------------------

export function DashboardLoading() {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
      <CircularProgress />
    </Stack>
  );
}
