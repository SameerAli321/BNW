import type { TableHeadCellProps } from 'src/components/table';
import type { ActivityLogScope } from 'src/actions/activity-logs';
import type {
  ActivityLogDto,
  ActivityLogFilters,
  CreateActivityLogDto,
} from 'src/types/activity-log';

import { useMemo, useState, useEffect } from 'react';
import { useTabs, useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  createActivityLog,
  deleteActivityLog,
  updateActivityLog,
  useGetActivityLogs,
} from 'src/actions/activity-logs';

import { toast } from 'src/components/snackbar';
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

import { ActivityLogDialog } from '../activity-log-dialog';
import { ActivityLogToolbar } from '../activity-log-toolbar';
import { ActivityLogTableRow } from '../activity-log-table-row';

// ----------------------------------------------------------------------

type ViewTab = 'mine' | 'team' | 'managers' | 'all';

const EMPTY_FILTERS: ActivityLogFilters = { from: '', to: '', category: '', q: '', role: '' };

/**
 * Daily activity log (guide §3.1 U3, docs/API_CONTRACT_ACTIVITY_LOG.md) — one page with
 * role-aware tabs, same approach as the Appraisals page:
 * - "My Activity": everyone logs and manages their own entries.
 * - "My Team": MANAGER — entries of their direct reports.
 * - "Managers": CEO — entries of every MANAGER (GET /activity-logs?role=MANAGER).
 * - "All Staff": CEO/ADMIN — everyone, with a role filter.
 * Each tab's SWR hook only fetches while that tab is selected and allowed for the role.
 */
export function ActivityLogListView() {
  const { user } = useAuthContext();
  const role = user?.role ?? '';

  const tabsList = useMemo(() => {
    const list: { value: ViewTab; label: string }[] = [{ value: 'mine', label: 'My Activity' }];
    if (role === 'MANAGER') list.push({ value: 'team', label: 'My Team' });
    if (role === 'CEO') list.push({ value: 'managers', label: 'Managers' });
    if (role === 'CEO' || role === 'ADMIN') list.push({ value: 'all', label: 'All Staff' });
    return list;
  }, [role]);

  const tabs = useTabs<ViewTab>('mine');
  const table = useTable({ defaultRowsPerPage: 25 });
  const filters = useSetState<ActivityLogFilters>(EMPTY_FILTERS);
  const { state: currentFilters, resetState: resetFilters } = filters;

  const logDialog = useBoolean();
  const [editing, setEditing] = useState<ActivityLogDto | null>(null);

  // Filters and paging are per-tab — start fresh when switching.
  useEffect(() => {
    resetFilters();
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.value]);

  const scope: ActivityLogScope =
    tabs.value === 'mine' ? 'mine' : tabs.value === 'team' ? 'team' : 'all';
  const isOwnView = tabs.value === 'mine';

  const { logs, logsMeta, logsLoading } = useGetActivityLogs(
    scope,
    {
      from: currentFilters.from || undefined,
      to: currentFilters.to || undefined,
      category: currentFilters.category || undefined,
      q: isOwnView ? undefined : currentFilters.q || undefined,
      role:
        tabs.value === 'managers'
          ? 'MANAGER'
          : tabs.value === 'all'
            ? currentFilters.role || undefined
            : undefined,
      page: table.page + 1,
      limit: table.rowsPerPage,
    },
    tabsList.some((tab) => tab.value === tabs.value)
  );

  const tableHead: TableHeadCellProps[] = [
    { id: 'activityDate', label: 'Date', width: 130 },
    ...(isOwnView ? [] : [{ id: 'userName', label: 'Employee', width: 200 }]),
    { id: 'category', label: 'Category', width: 150 },
    { id: 'description', label: 'Description' },
    { id: 'hours', label: 'Hours', width: 90, align: 'right' as const },
    ...(isOwnView ? [{ id: '', width: 110 }] : []),
  ];

  const notFound = !logsLoading && !logs.length;

  const openNew = () => {
    setEditing(null);
    logDialog.onTrue();
  };

  const openEdit = (row: ActivityLogDto) => {
    setEditing(row);
    logDialog.onTrue();
  };

  const handleSave = async (payload: CreateActivityLogDto) => {
    if (editing) {
      await updateActivityLog(editing.id, payload);
    } else {
      await createActivityLog(payload);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteActivityLog(id);
      toast.success('Activity deleted!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Delete failed!');
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Daily Activity"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Daily Activity' }]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openNew}
          >
            Log activity
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {tabsList.length > 1 && (
          <Tabs
            value={tabs.value}
            onChange={tabs.onChange}
            sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
          >
            {tabsList.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        )}

        <ActivityLogToolbar
          filters={filters}
          onResetPage={table.onResetPage}
          showSearch={!isOwnView}
          showRole={tabs.value === 'all'}
        />

        {logsMeta && (
          <Typography variant="body2" sx={{ px: 2.5, pb: 2, color: 'text.secondary' }}>
            {logsMeta.total} {logsMeta.total === 1 ? 'entry' : 'entries'} ·{' '}
            <Box component="strong" sx={{ color: 'text.primary' }}>
              {logsMeta.totalHours} hours
            </Box>{' '}
            in total
          </Typography>
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 820 }}>
              <TableHeadCustom headCells={tableHead} rowCount={logs.length} />

              <TableBody>
                {logs.map((row) => (
                  <ActivityLogTableRow
                    key={row.id}
                    row={row}
                    showEmployee={!isOwnView}
                    canEdit={isOwnView}
                    onEdit={() => openEdit(row)}
                    onDelete={() => handleDelete(row.id)}
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
          count={logsMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      <ActivityLogDialog
        open={logDialog.value}
        onClose={logDialog.onFalse}
        current={editing}
        onConfirm={handleSave}
      />
    </DashboardContent>
  );
}
