import type { TableHeadCellProps } from 'src/components/table';
import type { IAuditLogTableFilters } from 'src/types/audit-log';

import { varAlpha } from 'minimal-shared/utils';
import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';

import { useGetAuditLogs } from 'src/actions/audit-logs';
import { DashboardContent } from 'src/layouts/dashboard';

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

import { AuditLogTableRow } from '../audit-log-table-row';
import { AuditLogTableToolbar } from '../audit-log-table-toolbar';

// ----------------------------------------------------------------------
// BNW OMS — Gap-fix (Gap 2, `audit_logs`), see docs/API_CONTRACT_GAPS_FIX.md. CEO/ADMIN only,
// read-only table (actor, action, entity, timestamp). Same table-component pattern as Staff
// Summary (server-side pagination, since audit logs are expected to grow unbounded).

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'actor', label: 'Actor' },
  { id: 'action', label: 'Action', width: 200 },
  { id: 'entity', label: 'Entity', width: 200 },
  { id: 'ipAddress', label: 'IP address', width: 160 },
  { id: 'createdAt', label: 'Timestamp', width: 200 },
];

export function AuditLogListView() {
  const table = useTable({ defaultRowsPerPage: 25, defaultOrderBy: 'createdAt' });

  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  const filters = useSetState<IAuditLogTableFilters>({ entity: '', action: '' });
  const { state: currentFilters } = filters;

  // `page` sent 1-based, same assumption as Staff Summary/Letters — see docs/FRONTEND_STATUS.md.
  const { auditLogs, auditLogsMeta, auditLogsLoading } = useGetAuditLogs({
    entity: currentFilters.entity || undefined,
    action: currentFilters.action || undefined,
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const notFound = !auditLogsLoading && !auditLogs.length;

  return (
    <RoleBasedGuard hasContent currentRole={currentRole} allowedRoles={['CEO', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Audit Log"
          links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Audit Log' }]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <AuditLogTableToolbar filters={filters} onResetPage={table.onResetPage} />

          <Box sx={{ position: 'relative' }}>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={TABLE_HEAD}
                  rowCount={auditLogs.length}
                  sx={{
                    '& .MuiTableCell-head': {
                      boxShadow: (theme) =>
                        `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
                    },
                  }}
                />

                <TableBody>
                  {auditLogs.map((row) => (
                    <AuditLogTableRow key={row.id} row={row} />
                  ))}

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={auditLogsMeta?.total ?? 0}
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
