import type { TableHeadCellProps } from 'src/components/table';

import { useMemo } from 'react';
import { useTabs, useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select, { type SelectChangeEvent } from '@mui/material/Select';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  useGetMyAppraisals,
  useGetAllAppraisals,
  useGetTeamAppraisals,
  createAppraisalRequest,
  useGetPendingCeoAppraisals,
} from 'src/actions/appraisals';

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

import { APPRAISAL_STATUS_OPTIONS } from 'src/types/appraisal';

import { AppraisalTableRow } from '../appraisal-table-row';
import { AppraisalRequestDialog } from '../appraisal-request-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'employee', label: 'Employee' },
  { id: 'manager', label: 'Manager', width: 180 },
  { id: 'status', label: 'Status', width: 170 },
  { id: 'submittedAt', label: 'Submitted', width: 130 },
  { id: '', width: 80 },
];

type ScopeTab = 'mine' | 'team' | 'pending-ceo' | 'all';

/**
 * "My Appraisals" + role-relevant scopes, per docs/API_CONTRACT_SPRINT4.md — built as one page
 * with tabs rather than separate pages/routes, so every role has a single obvious place to find
 * "appraisals relevant to them" (their own, their team's, pending their CEO review, or everything
 * for HR/Admin). No route-level RoleBasedGuard: every role can at least see "Mine"; the other
 * tabs simply aren't rendered for roles the contract doesn't grant them to, and the underlying
 * SWR hooks only fetch when their tab's `enabled` flag is true (conditional-key pattern, same as
 * `useGetLetter(id?)` elsewhere in the codebase) so a non-manager never even calls
 * `GET /appraisal-requests/team`.
 */
export function AppraisalListView() {
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  const canSeeTeam = currentRole === 'MANAGER' || currentRole === 'HR' || currentRole === 'ADMIN';
  const canSeePendingCeo = currentRole === 'CEO';
  const canSeeAll = currentRole === 'HR' || currentRole === 'ADMIN';

  const tabsList = useMemo(() => {
    const list: { value: ScopeTab; label: string }[] = [{ value: 'mine', label: 'My Appraisals' }];
    if (canSeeTeam) list.push({ value: 'team', label: "My Team's Appraisals" });
    if (canSeePendingCeo) list.push({ value: 'pending-ceo', label: 'Pending My Review' });
    if (canSeeAll) list.push({ value: 'all', label: 'All Appraisals' });
    return list;
  }, [canSeeTeam, canSeePendingCeo, canSeeAll]);

  const tabs = useTabs<ScopeTab>('mine');
  const table = useTable({ defaultRowsPerPage: 25 });
  const requestDialog = useBoolean();

  const statusFilter = useSetState<{ status: string }>({ status: '' });
  const { state: currentStatusFilter, setState: setStatusFilter } = statusFilter;

  const handleFilterStatus = (event: SelectChangeEvent) => {
    table.onResetPage();
    setStatusFilter({ status: event.target.value });
  };

  const mine = useGetMyAppraisals();
  const team = useGetTeamAppraisals(
    { status: currentStatusFilter.status || undefined },
    tabs.value === 'team' && canSeeTeam
  );
  const pendingCeo = useGetPendingCeoAppraisals(tabs.value === 'pending-ceo' && canSeePendingCeo);
  const all = useGetAllAppraisals(
    {
      status: currentStatusFilter.status || undefined,
      page: table.page + 1,
      limit: table.rowsPerPage,
    },
    tabs.value === 'all' && canSeeAll
  );

  const { rows, rowsLoading, rowsTotal } = (() => {
    switch (tabs.value) {
      case 'team':
        return { rows: team.appraisals, rowsLoading: team.appraisalsLoading, rowsTotal: team.appraisals.length };
      case 'pending-ceo':
        return {
          rows: pendingCeo.appraisals,
          rowsLoading: pendingCeo.appraisalsLoading,
          rowsTotal: pendingCeo.appraisals.length,
        };
      case 'all':
        return { rows: all.appraisals, rowsLoading: all.appraisalsLoading, rowsTotal: all.appraisalsMeta?.total ?? 0 };
      case 'mine':
      default:
        return { rows: mine.appraisals, rowsLoading: mine.appraisalsLoading, rowsTotal: mine.appraisals.length };
    }
  })();

  const notFound = !rowsLoading && !rows.length;
  const showStatusFilter = tabs.value === 'team' || tabs.value === 'all';
  const showPagination = tabs.value === 'all';

  const canRequestNext = mine.appraisalsMeta?.canRequestNext ?? true;
  const nextEligibleDate = mine.appraisalsMeta?.nextEligibleDate;

  const handleRequest = async (selfEvaluation: string) => {
    await createAppraisalRequest({ selfEvaluation });
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Appraisals"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Appraisals' }]}
        action={
          tabs.value === 'mine' && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={requestDialog.onTrue}
              disabled={!canRequestNext}
            >
              Request appraisal
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {tabs.value === 'mine' && !canRequestNext && nextEligibleDate && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You can request your next appraisal on{' '}
          {new Date(nextEligibleDate).toLocaleDateString()} (once every 3 months).
        </Alert>
      )}

      <Card>
        {tabsList.length > 1 && (
          <Tabs value={tabs.value} onChange={tabs.onChange} sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}>
            {tabsList.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        )}

        {showStatusFilter && (
          <Box sx={{ p: 2.5, display: 'flex', gap: 2 }}>
            <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 220 } }}>
              <InputLabel htmlFor="filter-appraisal-status-select">Status</InputLabel>
              <Select
                value={currentStatusFilter.status}
                onChange={handleFilterStatus}
                input={<OutlinedInput label="Status" />}
                inputProps={{ id: 'filter-appraisal-status-select' }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
              >
                <MenuItem value="">All</MenuItem>
                {APPRAISAL_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 720 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={rows.length}
                onSort={table.onSort}
              />

              <TableBody>
                {rows.map((row) => (
                  <AppraisalTableRow
                    key={row.id}
                    row={row}
                    detailsHref={paths.dashboard.appraisals.details(row.id)}
                  />
                ))}

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        {showPagination && (
          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={rowsTotal}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        )}
      </Card>

      <AppraisalRequestDialog
        open={requestDialog.value}
        onClose={requestDialog.onFalse}
        onConfirm={handleRequest}
      />
    </DashboardContent>
  );
}
