import type { LeaveScope } from 'src/actions/leave';
import type { TableHeadCellProps } from 'src/components/table';

import { useMemo, useState } from 'react';
import { useTabs, useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetLeaveBalance, useGetLeaveRequests } from 'src/actions/leave';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { LEAVE_STATUS_OPTIONS } from 'src/types/leave';

import {
  leaveDatesText,
  LeaveStatusLabel,
  LeaveBalanceCards,
  LeavePolicyEditor,
  LEAVE_STATUS_LABEL,
} from '../leave-components';

// ----------------------------------------------------------------------

/**
 * Leave / holiday: the caller's balance for the year, then "My leave" (their holiday record),
 * "Waiting for my approval" (as someone's manager) and "All leave" for HR / ADMIN / CEO. HR /
 * ADMIN can also edit the leave policy (yearly allowances).
 */
export function LeaveListView() {
  const { user } = useAuthContext();
  const role = user?.role ?? '';
  const canSeeAll = ['HR', 'ADMIN', 'CEO'].includes(role);
  const canSeeTeam = role !== 'EMPLOYEE';
  const canEditPolicy = ['HR', 'ADMIN'].includes(role);
  const year = new Date().getFullYear();

  const tabsList = useMemo(() => {
    const list: { value: LeaveScope; label: string }[] = [{ value: 'mine', label: 'My leave' }];
    if (canSeeTeam) list.push({ value: 'team', label: 'Waiting for my approval' });
    if (canSeeAll) list.push({ value: 'all', label: 'All leave' });
    return list;
  }, [canSeeAll, canSeeTeam]);

  const tabs = useTabs<LeaveScope>('mine');
  const scope: LeaveScope = tabs.value || 'mine';
  const table = useTable({ defaultRowsPerPage: 25 });
  const policyDialog = useBoolean();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { balances } = useGetLeaveBalance(user?.id, year);
  const current = useGetLeaveRequests(scope, {
    status: status || (scope === 'team' ? 'PENDING_MANAGER' : undefined),
    q: scope !== 'mine' ? search.trim() || undefined : undefined,
    page: table.page + 1,
    limit: table.rowsPerPage,
  });
  const showEmployee = scope !== 'mine';

  const tableHead = useMemo<TableHeadCellProps[]>(
    () => [
      ...(showEmployee ? [{ id: 'employee', label: 'Employee' }] : []),
      { id: 'type', label: 'Leave type', width: 150 },
      { id: 'dates', label: 'Dates' },
      { id: 'reason', label: 'Reason' },
      { id: 'status', label: 'Status', width: 180 },
      { id: '', width: 70 },
    ],
    [showEmployee]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Leave & Holidays"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Leave & Holidays' },
        ]}
        action={
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.5 }}>
            {canEditPolicy && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={policyDialog.onTrue}
              >
                Leave policy
              </Button>
            )}
            <Button
              component={RouterLink}
              href={paths.dashboard.leaveRequests.new}
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              Apply for leave
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <Box sx={{ mb: 3 }}>
        <LeaveBalanceCards balances={balances} year={year} />
      </Box>

      <Card>
        {tabsList.length > 1 && (
          <Tabs
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            value={scope}
            onChange={(event, value) => {
              table.onResetPage();
              setStatus('');
              tabs.onChange(event, value);
            }}
            sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
          >
            {tabsList.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        )}

        <Box sx={{ p: 2.5, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(event) => {
              table.onResetPage();
              setStatus(event.target.value);
            }}
            sx={{ width: { xs: 1, md: 240 } }}
          >
            <MenuItem value="">{scope === 'team' ? 'Waiting for manager' : 'All'}</MenuItem>
            {LEAVE_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {LEAVE_STATUS_LABEL[option]}
              </MenuItem>
            ))}
          </TextField>
          {showEmployee && (
            <TextField
              label="Search by name or employee code"
              value={search}
              onChange={(event) => {
                table.onResetPage();
                setSearch(event.target.value);
              }}
              sx={{ width: { xs: 1, md: 320 } }}
            />
          )}
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 760 }}>
              <TableHeadCustom headCells={tableHead} rowCount={current.requests.length} />
              <TableBody>
                {current.requests.map((row) => {
                  const href = paths.dashboard.leaveRequests.details(row.id);
                  return (
                    <TableRow key={row.id} hover>
                      {showEmployee && (
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Link component={RouterLink} href={href} color="inherit">
                            {row.employeeName}
                          </Link>
                        </TableCell>
                      )}
                      <TableCell>
                        {showEmployee ? (
                          row.leaveTypeName
                        ) : (
                          <Link component={RouterLink} href={href} color="inherit">
                            {row.leaveTypeName}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{leaveDatesText(row)}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 260,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.reason}
                      </TableCell>
                      <TableCell>
                        <LeaveStatusLabel status={row.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton component={RouterLink} href={href}>
                            <Iconify icon="solar:eye-bold" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableNoData notFound={!current.requestsLoading && !current.requests.length} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={current.requestsMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {canEditPolicy && (
        <Dialog
          open={policyDialog.value}
          onClose={policyDialog.onFalse}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
        >
          <DialogTitle>Leave policy</DialogTitle>
          <DialogContent>
            <LeavePolicyEditor />
          </DialogContent>
          <DialogActions>
            <Button onClick={policyDialog.onFalse}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </DashboardContent>
  );
}
