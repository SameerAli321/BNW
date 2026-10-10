import type { TableHeadCellProps } from 'src/components/table';

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
import { useGetComplaints } from 'src/actions/complaints';

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

import { COMPLAINT_STATUS_OPTIONS } from 'src/types/complaint';

import { ComplaintTableRow } from '../complaint-table-row';
import { COMPLAINT_STATUS_LABEL } from '../complaint-status-label';

// ----------------------------------------------------------------------

type ScopeTab = 'mine' | 'all';

/**
 * Complaints — "My complaints" for everyone, plus "All complaints" for HR / ADMIN / CEO (the only
 * roles `GET /complaints` allows). Anyone can file a new complaint from here.
 */
export function ComplaintListView() {
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';
  const canSeeAll = ['HR', 'ADMIN', 'CEO'].includes(currentRole);

  const tabs = useTabs<ScopeTab>(canSeeAll ? 'all' : 'mine');
  const table = useTable({ defaultRowsPerPage: 25 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const query = {
    status: status || undefined,
    page: table.page + 1,
    limit: table.rowsPerPage,
  };
  const mine = useGetComplaints('mine', query, tabs.value === 'mine');
  const all = useGetComplaints(
    'all',
    { ...query, q: search.trim() || undefined },
    tabs.value === 'all' && canSeeAll
  );
  const current = tabs.value === 'all' ? all : mine;
  const notFound = !current.complaintsLoading && !current.complaints.length;

  const tableHead = useMemo<TableHeadCellProps[]>(
    () => [
      { id: 'id', label: 'Ref', width: 80 },
      ...(tabs.value === 'all' ? [{ id: 'complainant', label: 'Submitted by' }] : []),
      { id: 'summary', label: 'Complaint' },
      { id: 'status', label: 'Status', width: 140 },
      { id: 'createdAt', label: 'Date', width: 130 },
      { id: '', width: 80 },
    ],
    [tabs.value]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Complaints"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms }, { name: 'Complaints' }]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.complaints.new}
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New complaint
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {canSeeAll && (
          <Tabs
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            value={tabs.value}
            onChange={(event, value) => {
              table.onResetPage();
              tabs.onChange(event, value);
            }}
            sx={{
              px: 2.5,
              boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}`,
            }}
          >
            <Tab value="all" label="All complaints" />
            <Tab value="mine" label="My complaints" />
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
            sx={{ width: { xs: 1, md: 220 } }}
          >
            <MenuItem value="">All</MenuItem>
            {COMPLAINT_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {COMPLAINT_STATUS_LABEL[option]}
              </MenuItem>
            ))}
          </TextField>

          {tabs.value === 'all' && (
            <TextField
              label="Search by name or email"
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
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 720 }}>
              <TableHeadCustom headCells={tableHead} rowCount={current.complaints.length} />

              <TableBody>
                {current.complaints.map((row) => (
                  <ComplaintTableRow
                    key={row.id}
                    row={row}
                    showComplainant={tabs.value === 'all'}
                    detailsHref={paths.dashboard.complaints.details(row.id)}
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
          count={current.complaintsMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
