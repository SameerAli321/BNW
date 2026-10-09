import type { TableHeadCellProps } from 'src/components/table';

import { useState } from 'react';
import { Navigate } from 'react-router';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetOnboardingForms } from 'src/actions/onboarding-forms';

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

import { OnboardingFormStatusLabel } from '../onboarding-form-details';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'employee', label: 'Employee' },
  { id: 'jobTitle', label: 'Job title', width: 200 },
  { id: 'dateOfJoining', label: 'Date of joining', width: 150 },
  { id: 'status', label: 'Status', width: 160 },
  { id: 'submitted', label: 'Submitted', width: 130 },
  { id: '', width: 80 },
];

/**
 * Sidebar target for "Onboarding Form". HR / ADMIN / CEO see everyone's submitted forms (with a
 * link to their own); every other role goes straight to their own form.
 */
export function OnboardingFormListView() {
  const { user } = useAuthContext();
  const canSeeAll = ['HR', 'ADMIN', 'CEO'].includes(user?.role ?? '');

  const table = useTable({ defaultRowsPerPage: 25 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { forms, formsMeta, formsLoading } = useGetOnboardingForms(
    {
      status: status || undefined,
      q: search.trim() || undefined,
      page: table.page + 1,
      limit: table.rowsPerPage,
    },
    canSeeAll
  );

  if (!canSeeAll) {
    return <Navigate to={paths.dashboard.onboardingForms.mine} replace />;
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Onboarding Forms"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms }, { name: 'Onboarding Forms' }]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.onboardingForms.mine}
            variant="outlined"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            My onboarding form
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
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
            <MenuItem value="SUBMITTED">Waiting for HR</MenuItem>
            <MenuItem value="RECORDED">Recorded by HR</MenuItem>
          </TextField>
          <TextField
            label="Search by name, email or employee code"
            value={search}
            onChange={(event) => {
              table.onResetPage();
              setSearch(event.target.value);
            }}
            sx={{ width: { xs: 1, md: 340 } }}
          />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 760 }}>
              <TableHeadCustom headCells={TABLE_HEAD} rowCount={forms.length} />

              <TableBody>
                {forms.map((row) => {
                  const href = paths.dashboard.onboardingForms.details(row.id);
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Link component={RouterLink} href={href} color="inherit">
                          {row.fullName}
                        </Link>
                        {row.employeeCode ? ` (${row.employeeCode})` : ''}
                      </TableCell>
                      <TableCell>{row.jobTitle ?? '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {row.dateOfJoining ? fDate(row.dateOfJoining) : '—'}
                      </TableCell>
                      <TableCell>
                        <OnboardingFormStatusLabel status={row.status} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.employeeSignedAt)}</TableCell>
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

                <TableNoData notFound={!formsLoading && !forms.length} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={formsMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
