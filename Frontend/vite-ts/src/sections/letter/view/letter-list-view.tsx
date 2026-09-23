import type { ILetterTableFilters } from 'src/types/letter';
import type { TableHeadCellProps } from 'src/components/table';

import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetLetters } from 'src/actions/letters';
import { DashboardContent } from 'src/layouts/dashboard';

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

import { LetterTableRow } from '../letter-table-row';
import { LetterTableToolbar } from '../letter-table-toolbar';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'subject', label: 'Employee' },
  { id: 'template', label: 'Template' },
  { id: 'type', label: 'Type', width: 130 },
  { id: 'status', label: 'Status', width: 150 },
  { id: 'preparedBy', label: 'Prepared by', width: 160 },
  { id: 'createdAt', label: 'Created', width: 110 },
  { id: '', width: 260 },
];

/**
 * Letters list — U-series H2-H9 (see docs/API_CONTRACT_SPRINT3.md). No `RoleBasedGuard` role
 * check here: HR/CEO/ADMIN see every letter, everyone else only ever sees their own (server-side
 * filter on `GET /letters`, not a role gate the frontend needs to enforce) — that's how an
 * employee finds a letter waiting for their signature.
 */
export function LetterListView() {
  const table = useTable({ defaultRowsPerPage: 25, defaultOrderBy: 'createdAt' });

  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';
  const canCreate = currentRole === 'HR' || currentRole === 'ADMIN';

  const filters = useSetState<ILetterTableFilters>({ type: '', status: '' });
  const { state: currentFilters } = filters;

  const { letters, lettersMeta, lettersLoading } = useGetLetters({
    type: currentFilters.type || undefined,
    status: currentFilters.status || undefined,
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const notFound = !lettersLoading && !letters.length;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Letters"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Letters' }]}
        action={
          canCreate && (
            <Button
              component={RouterLink}
              href={paths.dashboard.letters.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New letter
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <LetterTableToolbar filters={filters} onResetPage={table.onResetPage} />

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={letters.length}
                onSort={table.onSort}
              />

              <TableBody>
                {letters.map((row) => (
                  <LetterTableRow
                    key={row.id}
                    row={row}
                    detailsHref={paths.dashboard.letters.details(row.id)}
                    currentRole={currentRole}
                    currentUserId={currentAuthUser?.id}
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
          count={lettersMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
