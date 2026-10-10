import type { TableHeadCellProps } from 'src/components/table';
import type { WorkOrderType, WorkOrderScope, WorkOrderStatus } from 'src/actions/work-orders';

import { useMemo, useState } from 'react';
import { useTabs, useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fPkr,
  useGetWorkOrders,
  useGetWorkOrderSettings,
  WORK_ORDER_STATUS_OPTIONS,
} from 'src/actions/work-orders';

import { Label } from 'src/components/label';
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

import {
  WorkOrderTypeLabel,
  workOrderStatusText,
  WorkOrderStatusLabel,
  WorkOrderSettingsDialog,
} from '../work-order-components';

// ----------------------------------------------------------------------

/**
 * Work orders: "Waiting for me" (anything at the caller's approval step), "My requests",
 * "My team" (as a line manager) and "All" for HR / ADMIN / CEO / PAYROLL (Payroll sees
 * reimbursements only). Filter by type / status, search by name.
 */
export function WorkOrderListView() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const role = user?.role ?? '';
  const canSeeAll = ['HR', 'ADMIN', 'CEO', 'PAYROLL'].includes(role);
  const canEditSettings = ['HR', 'ADMIN'].includes(role);
  const { settings } = useGetWorkOrderSettings();
  const settingsDialog = useBoolean();

  // Is anything waiting on me? (drives the default tab)
  const { workOrdersMeta: queueMeta } = useGetWorkOrders('queue', { limit: 1 });
  const queueCount = queueMeta?.total ?? 0;

  const tabsList = useMemo(() => {
    const list: { value: WorkOrderScope; label: string; count?: number }[] = [
      { value: 'mine', label: 'My requests' },
      { value: 'queue', label: 'Waiting for me', count: queueCount },
    ];
    if (role !== 'EMPLOYEE') list.push({ value: 'team', label: 'My team' });
    if (canSeeAll) list.push({ value: 'all', label: 'All work orders' });
    return list;
  }, [canSeeAll, role, queueCount]);

  const initialTab = (searchParams.get('tab') as WorkOrderScope | null) ?? 'mine';
  const tabs = useTabs<WorkOrderScope>(initialTab);
  const scope: WorkOrderScope = tabs.value || 'mine';
  const table = useTable({ defaultRowsPerPage: 25 });
  const [type, setType] = useState<WorkOrderType | ''>(
    (searchParams.get('type') as WorkOrderType | null) ?? ''
  );
  const [status, setStatus] = useState<WorkOrderStatus | ''>('');
  const [search, setSearch] = useState('');

  const { workOrders, workOrdersMeta, workOrdersLoading } = useGetWorkOrders(scope, {
    type: type || undefined,
    status: status || undefined,
    q: scope !== 'mine' ? search.trim() || undefined : undefined,
    page: table.page + 1,
    limit: table.rowsPerPage,
  });
  const showEmployee = scope !== 'mine';

  const tableHead = useMemo<TableHeadCellProps[]>(
    () => [
      { id: 'ref', label: 'Ref', width: 80 },
      ...(showEmployee ? [{ id: 'employee', label: 'Employee' }] : []),
      { id: 'title', label: 'Request' },
      { id: 'type', label: 'Type', width: 150 },
      { id: 'amount', label: 'Amount', width: 130, align: 'right' as const },
      { id: 'date', label: 'Submitted', width: 130 },
      { id: 'status', label: 'Status', width: 150 },
    ],
    [showEmployee]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Work orders"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Work orders' },
        ]}
        action={
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.5 }}>
            {canEditSettings && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Iconify icon="solar:settings-bold" />}
                onClick={settingsDialog.onTrue}
              >
                Settings
              </Button>
            )}
            <Button
              component={RouterLink}
              href={`${paths.dashboard.workOrders.new}?type=EQUIPMENT`}
              variant="outlined"
              startIcon={<Iconify icon="solar:monitor-bold" />}
            >
              Request equipment
            </Button>
            <Button
              component={RouterLink}
              href={`${paths.dashboard.workOrders.new}?type=REIMBURSEMENT`}
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="solar:wad-of-money-bold" />}
            >
              Claim reimbursement
            </Button>
          </Stack>
        }
        sx={{ mb: 2 }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Reimbursements go to your line manager, then Payroll pays them. Equipment requests go to
        your line manager, then HR issues the item.
        {settings ? ` Anything over ${fPkr(settings.ceoApprovalLimit)} also needs the CEO's approval.` : ''}
      </Typography>

      <Card>
        <Tabs
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          value={scope}
          onChange={(event, value) => {
            table.onResetPage();
            setStatus('');
            tabs.onChange(event, value);
          }}
          sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
        >
          {tabsList.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              iconPosition="end"
              icon={
                tab.count ? (
                  <Label variant="filled" color="warning">
                    {tab.count}
                  </Label>
                ) : undefined
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <TextField
            select
            label="Type"
            value={type}
            onChange={(event) => {
              table.onResetPage();
              setType(event.target.value as WorkOrderType | '');
            }}
            sx={{ width: { xs: 1, md: 200 } }}
          >
            <MenuItem value="">All types</MenuItem>
            <MenuItem value="REIMBURSEMENT">Reimbursement</MenuItem>
            <MenuItem value="EQUIPMENT">Equipment</MenuItem>
          </TextField>
          {scope !== 'queue' && (
            <TextField
              select
              label="Status"
              value={status}
              onChange={(event) => {
                table.onResetPage();
                setStatus(event.target.value as WorkOrderStatus | '');
              }}
              sx={{ width: { xs: 1, md: 200 } }}
            >
              <MenuItem value="">All</MenuItem>
              {WORK_ORDER_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {workOrderStatusText(option, type || undefined)}
                </MenuItem>
              ))}
            </TextField>
          )}
          {showEmployee && (
            <TextField
              label="Search by name, code or title"
              value={search}
              onChange={(event) => {
                table.onResetPage();
                setSearch(event.target.value);
              }}
              sx={{ width: { xs: 1, md: 320 } }}
            />
          )}
        </Box>

        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 820 }}>
            <TableHeadCustom headCells={tableHead} rowCount={workOrders.length} />
            <TableBody>
              {workOrders.map((row) => {
                const href = paths.dashboard.workOrders.details(row.id);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>WO-{row.id}</TableCell>
                    {showEmployee && (
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employeeName}</TableCell>
                    )}
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Link component={RouterLink} href={href} color="inherit" sx={{ fontWeight: 600 }}>
                        {row.title}
                      </Link>
                      <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                        {row.category}
                        {row.type === 'EQUIPMENT' && row.quantity && row.quantity > 1 ? ` · ×${row.quantity}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <WorkOrderTypeLabel type={row.type} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {fPkr(row.amount)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.createdAt)}</TableCell>
                    <TableCell>
                      <WorkOrderStatusLabel status={row.status} type={row.type} />
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableNoData notFound={!workOrdersLoading && !workOrders.length} />
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={workOrdersMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {canEditSettings && settingsDialog.value && (
        <WorkOrderSettingsDialog open onClose={settingsDialog.onFalse} />
      )}
    </DashboardContent>
  );
}
