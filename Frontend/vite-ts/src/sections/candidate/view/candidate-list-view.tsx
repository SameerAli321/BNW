import type { TableHeadCellProps } from 'src/components/table';

import { varAlpha } from 'minimal-shared/utils';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetCandidates } from 'src/actions/candidates';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  rowInPage,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { CANDIDATE_STATUS_OPTIONS } from 'src/types/candidate';

import { CandidateTableRow } from '../candidate-table-row';
import { CandidateBulkUploadDialog } from '../candidate-bulk-upload-dialog';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  ...CANDIDATE_STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
];

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'name', label: 'Candidate' },
  { id: 'phone', label: 'Phone', width: 140 },
  { id: 'cv', label: 'CV' },
  { id: 'status', label: 'Status', width: 130 },
  { id: 'uploadedBy', label: 'Uploaded by', width: 160 },
  { id: 'createdAt', label: 'Uploaded', width: 120 },
  { id: '', width: 68 },
];

// ----------------------------------------------------------------------

export function CandidateListView() {
  const table = useTable();

  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  const uploadDialog = useBoolean();

  const filters = useSetState<{ name: string; status: string }>({ name: '', status: 'all' });
  const { state: currentFilters, setState: updateFilters } = filters;

  // Wired to GET /candidates?status=&q=&page=&limit= per docs/API_CONTRACT_SPRINT5.md.
  const { candidates, candidatesLoading } = useGetCandidates({
    q: currentFilters.name || undefined,
    status: currentFilters.status !== 'all' ? currentFilters.status : undefined,
    limit: 200,
  });

  const dataInPage = rowInPage(candidates, table.page, table.rowsPerPage);
  const notFound = !candidatesLoading && !candidates.length;

  const handleFilterStatus = (event: React.SyntheticEvent, newValue: string) => {
    table.onResetPage();
    updateFilters({ status: newValue });
  };

  return (
    <RoleBasedGuard hasContent currentRole={currentRole} allowedRoles={['HR', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Hiring — Candidates"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Hiring', href: paths.dashboard.candidates.root },
            { name: 'Candidates' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              onClick={uploadDialog.onTrue}
            >
              Bulk upload CVs
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <Tabs
            value={currentFilters.status}
            onChange={handleFilterStatus}
            sx={[
              (theme) => ({
                px: 2.5,
                boxShadow: `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
              }),
            ]}
          >
            {STATUS_OPTIONS.map((tab) => (
              <Tab
                key={tab.value}
                iconPosition="end"
                value={tab.value}
                label={tab.label}
                icon={
                  <Label
                    variant={
                      ((tab.value === 'all' || tab.value === currentFilters.status) && 'filled') ||
                      'soft'
                    }
                    color={
                      (tab.value === 'HIRED' && 'success') ||
                      (tab.value === 'SHORTLISTED' && 'info') ||
                      (tab.value === 'OFFERED' && 'warning') ||
                      (tab.value === 'REJECTED' && 'error') ||
                      'default'
                    }
                  >
                    {tab.value === 'all'
                      ? candidates.length
                      : candidates.filter((c) => c.status === tab.value).length}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <Box sx={{ p: 2.5, pt: 2 }}>
            <TextField
              fullWidth
              value={currentFilters.name}
              onChange={(event) => {
                table.onResetPage();
                updateFilters({ name: event.target.value });
              }}
              placeholder="Search by name or email..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ maxWidth: { sm: 360 } }}
            />
          </Box>

          <Box sx={{ position: 'relative' }}>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={TABLE_HEAD}
                  rowCount={candidates.length}
                  onSort={table.onSort}
                />

                <TableBody>
                  {dataInPage.map((row) => (
                    <CandidateTableRow key={row.id} row={row} />
                  ))}

                  <TableEmptyRows
                    height={table.dense ? 56 : 56 + 20}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, candidates.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={candidates.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      </DashboardContent>

      <CandidateBulkUploadDialog open={uploadDialog.value} onClose={uploadDialog.onFalse} />
    </RoleBasedGuard>
  );
}
