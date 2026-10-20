import type { TodayStatus, TeamStatusRow } from 'src/actions/team-status';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { useGetDepartments } from 'src/actions/users';
import { useGetTeamStatus } from 'src/actions/team-status';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { DashboardCardHeader } from './dashboard-widgets';
import { DashboardStaffActivityDrawer } from './dashboard-staff-activity-drawer';

// ----------------------------------------------------------------------

const TODAY_META: Record<
  TodayStatus,
  { label: string; color: 'success' | 'warning' | 'info' | 'default' }
> = {
  AVAILABLE: { label: 'Available', color: 'success' },
  ON_LEAVE: { label: 'On leave', color: 'warning' },
  IN_MEETING: { label: 'In a meeting', color: 'info' },
  INACTIVE: { label: 'Inactive', color: 'default' },
};

type QuickFilter = '' | TodayStatus | 'PENDING';

const days = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} d`;

const fDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function pendingBreakdown(row: TeamStatusRow): string[] {
  const p = row.pending;
  return [
    p.leave ? `${p.leave} leave request${p.leave > 1 ? 's' : ''}` : null,
    p.attendance ? `${p.attendance} attendance regularization${p.attendance > 1 ? 's' : ''}` : null,
    p.workOrders ? `${p.workOrders} work order${p.workOrders > 1 ? 's' : ''}` : null,
    p.appraisals ? `${p.appraisals} appraisal${p.appraisals > 1 ? 's' : ''}` : null,
    p.lettersToSign ? `${p.lettersToSign} letter${p.lettersToSign > 1 ? 's' : ''} to sign` : null,
    p.forms ? `${p.forms} form${p.forms > 1 ? 's' : ''} to fill in` : null,
  ].filter((x): x is string => !!x);
}

/**
 * "Team status" at the end of the dashboard (CEO / HR / ADMIN: everyone; Team Leads: their direct
 * reports). One row per person: where they are today, their leave this year (approved / still
 * pending / left), their next leave, and requests or forms they still have in progress. Filter by
 * the summary chips, name / code search and department. Refreshes every 2 minutes.
 */
export function DashboardTeamStatus() {
  const [quick, setQuick] = useState<QuickFilter>('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // The person whose full activity feed is open in the side drawer.
  const [activityFor, setActivityFor] = useState<TeamStatusRow | null>(null);
  const debounced = useDebounce(search.trim(), 300);
  const { departments } = useGetDepartments();

  const { rows, total, summary, scope, loading, validating, error, retry } = useGetTeamStatus({
    search: debounced,
    departmentId,
    status: quick && quick !== 'PENDING' ? quick : '',
    hasPending: quick === 'PENDING',
    page: page + 1,
    limit: rowsPerPage,
  });

  const isTeam = scope === 'team';
  const chips: { value: QuickFilter; label: string; count?: number; color: string }[] = [
    { value: '', label: 'Everyone', count: summary?.total, color: 'text.primary' },
    { value: 'AVAILABLE', label: 'Available', count: summary?.available, color: 'success.main' },
    { value: 'ON_LEAVE', label: 'On leave', count: summary?.onLeave, color: 'warning.main' },
    { value: 'IN_MEETING', label: 'In a meeting', count: summary?.inMeeting, color: 'info.main' },
    { value: 'PENDING', label: 'Requests pending', count: summary?.withPending, color: 'error.main' },
    { value: 'INACTIVE', label: 'Inactive', count: summary?.inactive, color: 'text.disabled' },
  ];
  const filtersActive = !!quick || !!debounced || departmentId !== '';

  return (
    <Card sx={{ mt: 3, position: 'relative' }}>
      {validating && !loading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }} />
      )}
      <DashboardCardHeader
        title={isTeam ? 'My team status' : 'Staff status'}
        subheader="Where everyone is today, their leave this year and requests in progress — click a person to see all their activity"
        icon="solar:users-group-rounded-bold"
      />

      {/* Summary chips double as quick filters. */}
      <Box
        sx={{
          px: 2.5,
          pt: 2.5,
          gap: 1.5,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
        }}
      >
        {chips.map((chip) => {
          const selected = quick === chip.value;
          return (
            <ButtonBase
              key={chip.label}
              onClick={() => {
                setQuick(selected && chip.value ? '' : chip.value);
                setPage(0);
              }}
              aria-pressed={selected}
              sx={(theme) => ({
                p: 1.5,
                gap: 0.25,
                borderRadius: 1.5,
                textAlign: 'left',
                alignItems: 'flex-start',
                flexDirection: 'column',
                border: `1px solid ${selected ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
                bgcolor: selected
                  ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08)
                  : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
                '&:focus-visible': {
                  outline: `2px solid ${theme.vars.palette.primary.main}`,
                  outlineOffset: 1,
                },
              })}
            >
              <Typography variant="h5" sx={{ color: chip.color, lineHeight: 1.2 }}>
                {chip.count ?? '–'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {chip.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      <Box
        sx={{
          p: 2.5,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 220px auto' },
        }}
      >
        <TextField
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search name, employee code, email or job title…"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="Department"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value === '' ? '' : Number(e.target.value));
            setPage(0);
          }}
        >
          <MenuItem value="">All departments</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          color="inherit"
          disabled={!filtersActive}
          startIcon={<Iconify icon="solar:restart-bold" />}
          onClick={() => {
            setQuick('');
            setSearch('');
            setDepartmentId('');
            setPage(0);
          }}
        >
          Reset
        </Button>
      </Box>

      <TableContainer>
        <Scrollbar>
          <Table size="small" sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Today</TableCell>
                <TableCell>Leave this year</TableCell>
                <TableCell>Next leave</TableCell>
                <TableCell>Requests in progress</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyContent
                      title="Couldn't load staff status"
                      description={
                        error instanceof Error && error.message
                          ? `${error.message}. If the server was just updated, restart the backend and try again.`
                          : 'The server did not respond. Try again in a moment.'
                      }
                      action={
                        <Button
                          variant="outlined"
                          color="inherit"
                          startIcon={<Iconify icon="solar:restart-bold" />}
                          onClick={() => retry()}
                          sx={{ mt: 2 }}
                        >
                          Try again
                        </Button>
                      }
                      sx={{ py: 5 }}
                    />
                  </TableCell>
                </TableRow>
              ) : !rows.length ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyContent
                      title={filtersActive ? 'Nobody matches these filters' : isTeam ? 'No one reports to you yet' : 'No staff yet'}
                      description={filtersActive ? 'Try another filter or clear the search.' : undefined}
                      sx={{ py: 5 }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const today = TODAY_META[row.today.status];
                  const breakdown = pendingBreakdown(row);
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => setActivityFor(row)}
                      sx={{ cursor: 'pointer', opacity: row.today.status === 'INACTIVE' ? 0.6 : 1 }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 34, height: 34, fontSize: 13 }}>{initials(row.name)}</Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap>
                              {row.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
                              {[row.employeeCode, row.designation].filter(Boolean).join(' · ') || row.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.department ?? '—'}</Typography>
                        {!isTeam && row.manager && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Reports to {row.manager}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Label color={today.color}>{today.label}</Label>
                        {row.today.detail && row.today.status !== 'INACTIVE' && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                            {row.today.detail}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2">
                          {days(row.leave.taken)} approved · <strong>{days(row.leave.remaining)} left</strong>
                        </Typography>
                        {row.leave.pendingDays > 0 && (
                          <Typography variant="caption" sx={{ color: 'warning.main' }}>
                            {days(row.leave.pendingDays)} awaiting approval
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {row.leave.next ? (
                          <>
                            <Typography variant="body2">
                              {fDay(row.leave.next.startDate)}
                              {row.leave.next.endDate !== row.leave.next.startDate
                                ? ` – ${fDay(row.leave.next.endDate)}`
                                : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {row.leave.next.type}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {breakdown.length ? (
                          <Tooltip title={breakdown.join(' · ')}>
                            <Stack spacing={0.25} sx={{ cursor: 'default' }}>
                              <Box>
                                <Label color="error">{row.pending.total} pending</Label>
                              </Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                                {breakdown[0]}
                                {breakdown.length > 1 ? ` +${breakdown.length - 1} more` : ''}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            None
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View all activity">
                          <IconButton
                            onClick={(event) => {
                              event.stopPropagation();
                              setActivityFor(row);
                            }}
                            aria-label={`View ${row.name}'s activity`}
                          >
                            <Iconify icon="eva:arrow-ios-forward-fill" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>

      <DashboardStaffActivityDrawer person={activityFor} onClose={() => setActivityFor(null)} />

      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, next) => setPage(next)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPage(0);
        }}
      />
    </Card>
  );
}
