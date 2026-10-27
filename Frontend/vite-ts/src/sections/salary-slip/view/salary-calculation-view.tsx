import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { PAYROLL_SHEET_ROLES, SALARY_SLIP_MANAGER_ROLES } from 'src/actions/salary-slips';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { RoleBasedGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

import { LoansPanel } from '../loans-panel';
import { PayrollSheetPanel } from '../payroll-sheet';

// ----------------------------------------------------------------------

type CalculationTab = 'payroll' | 'loans';

/**
 * Salary Calculation (Finance & Reports): the monthly payroll sheet — where each employee's salary
 * slip is generated from their row — and employee loans. HR / Admin and the accountant (who fills
 * in Tax and Paid). The slips themselves are viewed and emailed on Salary Slips.
 */
export function SalaryCalculationView() {
  const { user } = useAuthContext();
  const canManage = SALARY_SLIP_MANAGER_ROLES.includes(user?.role ?? '');
  const [tab, setTab] = useState<CalculationTab>('payroll');

  return (
    <RoleBasedGuard hasContent currentRole={user?.role ?? ''} allowedRoles={PAYROLL_SHEET_ROLES}>
      <DashboardContent maxWidth={false}>
        <CustomBreadcrumbs
          heading="Salary calculation"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Salary calculation' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.salarySlips.root}
              variant="outlined"
              startIcon={<Iconify icon="solar:bill-list-bold" />}
            >
              Salary slips
            </Button>
          }
          sx={{ mb: 2 }}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {canManage
            ? 'The monthly payroll sheet, calculated like "Payroll for IT". Generate each employee’s salary slip from their row — then view, download or email it under Salary Slips.'
            : 'Fill in Tax and Paid on the monthly payroll sheet, and see employee loans.'}
        </Typography>

        <Card>
          <Tabs
            value={tab}
            onChange={(_event, value: CalculationTab) => setTab(value)}
            sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
          >
            <Tab value="payroll" label="Payroll sheet" />
            <Tab value="loans" label="Loans" />
          </Tabs>

          {tab === 'payroll' && <PayrollSheetPanel />}
          {tab === 'loans' && <LoansPanel canManage={canManage} />}
        </Card>
      </DashboardContent>
    </RoleBasedGuard>
  );
}
