import type { TableHeadCellProps } from 'src/components/table';
import type { AttendanceRegularizationScope } from 'src/actions/attendance-regularizations';

import { useMemo, useState } from 'react';
import { useTabs } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetAttendanceRegularizations } from 'src/actions/attendance-regularizations';

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

import { ATTENDANCE_REGULARIZATION_STATUS_OPTIONS } from 'src/types/attendance-regularization';

import { ATTENDANCE_STATUS_LABEL } from '../attendance-regularization-status-label';
import { AttendanceRegularizationTableRow } from '../attendance-regularization-table-row';

// ----------------------------------------------------------------------

/**
 * Attendance regularization forms: "My forms" for everyone, "Waiting for my recommendation" for
 * anyone who is someone's manager (the team endpoint just returns nothing for everyone else), and
 * "All forms" for HR / ADMIN / CEO.
 */
export function AttendanceRegularizationListView() {
  const { user } = useAuthContext();
  const role = user?.role ?? '';
  const canSeeAll = ['HR', 'ADMIN', 'CEO'].includes(role);
  const canSeeTeam = role !== 'EMPLOYEE';

  const tabsList = useMemo(() => {
    const list: { value: AttendanceRegularizationScope; label: string }[] = [
      { value: 'mine', label: 'My forms' },
    ];
    if (canSeeTeam) list.push({ value: 'team', label: 'Waiting for my recommendation' });
    if (canSeeAll) list.push({ value: 'all', label: 'All forms' });
    return list;
  }, [canSeeAll, canSeeTeam]);

  const tabs = useTabs<AttendanceRegularizationScope>(canSeeAll ? 'all' : 'mine');
  const table = useTable({ defaultRowsPerPage: 25 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // "Waiting for my recommendation" defaults to pending ones; the status filter still overrides.
  const scope: AttendanceRegularizationScope = tabs.value || 'mine';
  const effectiveStatus = status || (scope === 'team' ? 'PENDING_HOD' : undefined);
  const query = {
    status: effectiveStatus,
    q: scope !== 'mine' ? search.trim() || undefined : undefined,
    page: table.page + 1,
    limit: table.rowsPerPage,
  };
  const current = useGetAttendanceRegularizations(scope, query);
  const notFound = !current.formsLoading && !current.forms.length;
  const showEmployee = scope !== 'mine';

  const tableHead = useMemo<TableHeadCellProps[]>(
    () => [
      { id: 'attendanceDate', label: 'Date', width: 140 },
      ...(showEmployee ? [{ id: 'employee', label: 'Employee' }] : []),
      { id: 'times', label: 'Arrival / departure', width: 160 },
      { id: 'reason', label: 'Reason' },
      { id: 'status', label: 'Status', width: 190 },
      { id: '', width: 80 },
    ],
    [showEmployee]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Attendance Regularization"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Attendance Regularization' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.attendanceRegularizations.new}
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New form
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {tabsList.length > 1 && (
          <Tabs
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            value={tabs.value}
            onChange={(event, value) => {
              table.onResetPage();
              setStatus('');
              tabs.onChange(event, value);
            }}
            sx={{
              px: 2.5,
              boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}`,
            }}
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
            <MenuItem value="">{scope === 'team' ? 'Waiting for HOD' : 'All'}</MenuItem>
            {ATTENDANCE_REGULARIZATION_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {ATTENDANCE_STATUS_LABEL[option]}
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
              <TableHeadCustom headCells={tableHead} rowCount={current.forms.length} />

              <TableBody>
                {current.forms.map((row) => (
                  <AttendanceRegularizationTableRow
                    key={row.id}
                    row={row}
                    showEmployee={showEmployee}
                    detailsHref={paths.dashboard.attendanceRegularizations.details(row.id)}
                  />
                ))}

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={current.formsMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
