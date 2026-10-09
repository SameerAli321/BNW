import type { TableHeadCellProps } from 'src/components/table';
import type {
  SalarySlipDto,
  SalarySlipScope,
  SalarySlipEmailStatus as EmailStatus,
} from 'src/actions/salary-slips';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fSalary,
  useGetSalarySlips,
  EMAIL_STATUS_LABEL,
  SALARY_SLIP_MANAGER_ROLES,
} from 'src/actions/salary-slips';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableSkeleton,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import {
  useSalarySlipActions,
  SalarySlipEmailStatus,
  SalarySlipActionButtons,
  SalarySlipPreviewDialog,
} from '../salary-slip-components';

// ----------------------------------------------------------------------

/**
 * Salary slips. HR / ADMIN: "Salary slip history" (every employee — filter by month, email status,
 * search; show revisions) with View / Download / Print / Send / Resend / Revise, plus "My salary
 * slips". Everyone else only sees "My salary slips" (View / Download / Print).
 */
export function SalarySlipListView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const canManage = SALARY_SLIP_MANAGER_ROLES.includes(user?.role ?? '');

  const [scope, setScope] = useState<SalarySlipScope>(canManage ? 'all' : 'mine');
  const isAll = canManage && scope === 'all';
  const table = useTable({ defaultRowsPerPage: 25 });
  const [month, setMonth] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus | ''>('');
  const [search, setSearch] = useState('');
  const [includeSuperseded, setIncludeSuperseded] = useState(false);
  const [viewing, setViewing] = useState<SalarySlipDto | null>(null);
  const actions = useSalarySlipActions();

  const { salarySlips, salarySlipsMeta, salarySlipsLoading, salarySlipsError } = useGetSalarySlips(
    isAll ? 'all' : 'mine',
    {
      salaryMonth: month || undefined,
      emailStatus: isAll ? emailStatus || undefined : undefined,
      q: isAll ? search.trim() || undefined : undefined,
      includeSuperseded: isAll ? includeSuperseded : undefined,
      page: table.page + 1,
      limit: table.rowsPerPage,
    }
  );
  // How many current slips failed to send — shown as a banner for HR.
  const { salarySlipsMeta: failedMeta } = useGetSalarySlips(
    'all',
    { emailStatus: 'FAILED', limit: 1 },
    canManage
  );
  const failedCount = failedMeta?.total ?? 0;

  const tableHead = useMemo<TableHeadCellProps[]>(
    () => [
      ...(isAll ? [{ id: 'employee', label: 'Employee' }] : []),
      { id: 'month', label: 'Salary month', width: 170 },
      { id: 'gross', label: 'Gross salary', align: 'right' as const, width: 140 },
      { id: 'deductions', label: 'Deductions', align: 'right' as const, width: 130 },
      { id: 'net', label: 'Net salary', align: 'right' as const, width: 140 },
      { id: 'generated', label: 'Generated', width: 140 },
      ...(isAll ? [{ id: 'email', label: 'Email status', width: 120 }] : []),
      { id: 'actions', label: '', align: 'right' as const, width: isAll ? 230 : 150 },
    ],
    [isAll]
  );

  const resetPage = () => table.onResetPage();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Salary slips"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Salary slips' }]}
        action={
          canManage && (
            <Button
              component={RouterLink}
              href={paths.dashboard.salarySlips.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              Generate salary slip
            </Button>
          )
        }
        sx={{ mb: 2 }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {canManage
          ? 'Generate a salary slip for an employee, check the PDF, then email it to their registered address. Every slip is kept here with its email status.'
          : 'Your monthly salary slips. Open one to view, download or print it.'}
      </Typography>

      {canManage && failedCount > 0 && !(isAll && emailStatus === 'FAILED') && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                resetPage();
                setScope('all');
                setEmailStatus('FAILED');
              }}
            >
              Show
            </Button>
          }
        >
          {failedCount === 1
            ? '1 salary slip could not be emailed.'
            : `${failedCount} salary slips could not be emailed.`}{' '}
          Open them to see why and resend.
        </Alert>
      )}

      <Card>
        {canManage && (
          <Tabs
            value={scope}
            onChange={(_event, value: SalarySlipScope) => {
              resetPage();
              setScope(value);
            }}
            sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
          >
            <Tab value="all" label="Salary slip history" />
            <Tab value="mine" label="My salary slips" />
          </Tabs>
        )}

        <Box
          sx={{
            p: 2.5,
            gap: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: { md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <TextField
            type="month"
            label="Salary month"
            value={month}
            onChange={(event) => {
              resetPage();
              setMonth(event.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: { xs: 1, md: 200 } }}
          />
          {isAll && (
            <>
              <TextField
                select
                label="Email status"
                value={emailStatus}
                onChange={(event) => {
                  resetPage();
                  setEmailStatus(event.target.value as EmailStatus | '');
                }}
                sx={{ width: { xs: 1, md: 180 } }}
              >
                <MenuItem value="">All</MenuItem>
                {(Object.keys(EMAIL_STATUS_LABEL) as EmailStatus[]).map((status) => (
                  <MenuItem key={status} value={status}>
                    {EMAIL_STATUS_LABEL[status]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Search by name, ID or department"
                value={search}
                onChange={(event) => {
                  resetPage();
                  setSearch(event.target.value);
                }}
                sx={{ width: { xs: 1, md: 300 } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={includeSuperseded}
                    onChange={(event) => {
                      resetPage();
                      setIncludeSuperseded(event.target.checked);
                    }}
                  />
                }
                label="Show replaced revisions"
              />
            </>
          )}
          {(month || emailStatus || search) && (
            <Button
              color="error"
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
              onClick={() => {
                resetPage();
                setMonth('');
                setEmailStatus('');
                setSearch('');
              }}
            >
              Clear
            </Button>
          )}
        </Box>

        {salarySlipsError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {salarySlipsError.message}
          </Alert>
        )}

        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: isAll ? 1100 : 760 }}>
            <TableHeadCustom headCells={tableHead} rowCount={salarySlips.length} />
            <TableBody>
              {salarySlipsLoading ? (
                <TableSkeleton rowCount={5} cellCount={tableHead.length} sx={{ height: 69 }} />
              ) : (
                salarySlips.map((slip) => (
                  <TableRow key={slip.id} hover sx={{ ...(!slip.isCurrent && { opacity: 0.6 }) }}>
                    {isAll && (
                      <TableCell>
                        <Typography variant="subtitle2">{slip.employeeName}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {[slip.employeeCode, slip.departmentName].filter(Boolean).join(' · ') ||
                            '—'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {slip.salaryMonthLabel}
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                        {slip.revision > 1 && (
                          <Label variant="soft" color="info">
                            Rev {slip.revision}
                          </Label>
                        )}
                        {!slip.isCurrent && (
                          <Label variant="soft" color="warning">
                            Replaced
                          </Label>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {fSalary(slip.grossSalary)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'error.main' }}>
                      {fSalary(slip.totalDeductions)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                      {fSalary(slip.netSalary)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {fDate(slip.createdAt)}
                      {isAll && slip.generatedByName && (
                        <Typography
                          variant="caption"
                          component="div"
                          sx={{ color: 'text.secondary' }}
                        >
                          by {slip.generatedByName}
                        </Typography>
                      )}
                    </TableCell>
                    {isAll && (
                      <TableCell>
                        <SalarySlipEmailStatus slip={slip} />
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end">
                        <SalarySlipActionButtons
                          slip={slip}
                          canSend={isAll}
                          onView={() => setViewing(slip)}
                          actions={actions}
                        />
                        {isAll && slip.isCurrent && (
                          <Tooltip title="Revise (regenerate)">
                            <IconButton
                              disabled={actions.busy}
                              onClick={() =>
                                router.push(
                                  `${paths.dashboard.salarySlips.new}?employeeId=${slip.employeeId}&month=${slip.salaryMonth}`
                                )
                              }
                            >
                              <Iconify icon="solar:pen-bold" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableNoData notFound={!salarySlipsLoading && !salarySlips.length} />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={salarySlipsMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {viewing && (
        <SalarySlipPreviewDialog
          slip={salarySlips.find((s) => s.id === viewing.id) ?? viewing}
          canSend={isAll}
          onClose={() => setViewing(null)}
        />
      )}
    </DashboardContent>
  );
}
