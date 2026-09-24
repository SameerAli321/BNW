import type { TableHeadCellProps } from 'src/components/table';
import type { IStaffSummaryTableFilters } from 'src/types/employee-record';

import { varAlpha } from 'minimal-shared/utils';
import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';

import { useGetDepartments } from 'src/actions/users';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetStaffSummary, exportStaffSummaryCsv } from 'src/actions/employee-records';

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
import { RoleBasedGuard } from 'src/auth/guard';

import { USER_ROLE_OPTIONS } from 'src/types/user';

import { StaffSummaryTableRow } from '../staff-summary-table-row';
import { StaffSummaryTableToolbar } from '../staff-summary-table-toolbar';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'name', label: 'Name' },
  { id: 'employeeCode', label: 'Employee code', width: 140 },
  { id: 'department', label: 'Department', width: 160 },
  { id: 'designation', label: 'Designation', width: 160 },
  { id: 'manager', label: 'Manager', width: 160 },
  { id: 'role', label: 'Role', width: 110 },
  { id: 'joinDate', label: 'Join date', width: 110 },
  { id: 'status', label: 'Status', width: 100 },
  { id: 'documentCount', label: 'Docs', width: 70, align: 'center' },
  { id: '', width: 110 },
];

// ----------------------------------------------------------------------

/**
 * Staff Summary — U4 "Staff Database summary" (see docs/API_CONTRACT_SPRINT2.md). HR/CEO/ADMIN
 * only. Server-side search/filter/pagination (unlike the Sprint 1 Users list, which fetches up to
 * 200 rows and paginates client-side) — `GET /staff-summary` is meant for the full headcount, so
 * page/limit are sent to the API rather than sliced locally.
 */
export function StaffSummaryListView() {
  const table = useTable({ defaultRowsPerPage: 25, defaultOrderBy: 'name' });

  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  const filters = useSetState<IStaffSummaryTableFilters>({
    name: '',
    departmentId: '',
    role: '',
    status: 'all',
  });
  const { state: currentFilters } = filters;

  const { departments } = useGetDepartments();

  const currentFilterParams = {
    q: currentFilters.name || undefined,
    departmentId: currentFilters.departmentId ? Number(currentFilters.departmentId) : undefined,
    role: currentFilters.role || undefined,
    status: currentFilters.status !== 'all' ? currentFilters.status : undefined,
  };

  // Contract's `page` query param — assumed 1-based (see docs/FRONTEND_STATUS.md Sprint 2 section
  // for the deviation note if the backend turns out to be 0-based).
  const { rows, rowsMeta, rowsLoading } = useGetStaffSummary({
    ...currentFilterParams,
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const notFound = !rowsLoading && !rows.length;

  const handleExport = async () => {
    try {
      await exportStaffSummaryCsv(currentFilterParams);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Export failed!');
    }
  };

  return (
    <RoleBasedGuard hasContent currentRole={currentRole} allowedRoles={['HR', 'CEO', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Staff Summary"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Staff Summary' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:export-bold" />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <StaffSummaryTableToolbar
            filters={filters}
            onResetPage={table.onResetPage}
            options={{ roles: USER_ROLE_OPTIONS, departments }}
          />

          <Box sx={{ position: 'relative' }}>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1000 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={TABLE_HEAD}
                  rowCount={rows.length}
                  onSort={table.onSort}
                  sx={{
                    '& .MuiTableCell-head': {
                      boxShadow: (theme) =>
                        `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
                    },
                  }}
                />

                <TableBody>
                  {rows.map((row) => (
                    <StaffSummaryTableRow
                      key={row.id}
                      row={row}
                      recordHref={paths.dashboard.employees.record(row.id)}
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
            count={rowsMeta?.total ?? 0}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      </DashboardContent>
    </RoleBasedGuard>
  );
}
