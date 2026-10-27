import type { UserDto } from 'src/types/user';
import type { EmployeeLoanDto, EmployeeLoanStatus } from 'src/actions/salary-slips';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDate } from 'src/utils/format-time';

import { useGetUsers } from 'src/actions/users';
import {
  fSalary,
  cancelLoan,
  createLoan,
  useGetLoans,
  fSalaryMonth,
  currentSalaryMonth,
  loanMonthlyInstalment,
} from 'src/actions/salary-slips';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { TableNoData, TableSkeleton, TableHeadCustom } from 'src/components/table';

// ----------------------------------------------------------------------

const STATUS: Record<EmployeeLoanStatus, { label: string; color: 'info' | 'success' | 'default' }> =
  {
    ACTIVE: { label: 'Repaying', color: 'info' },
    COMPLETED: { label: 'Repaid', color: 'success' },
    CANCELLED: { label: 'Cancelled', color: 'default' },
  };

const HEAD = [
  { id: 'employee', label: 'Employee' },
  { id: 'amount', label: 'Loan amount', align: 'right' as const },
  { id: 'plan', label: 'Repayment plan' },
  { id: 'progress', label: 'Repaid', width: 220 },
  { id: 'remaining', label: 'Still owed', align: 'right' as const },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: '', align: 'right' as const },
];

/**
 * Employee loans repaid from salary: e.g. Rs 100,000 on a 6-month plan comes off the next 6
 * salary slips in equal parts (the payroll sheet's "Loan deduction" column). HR / Admin add and
 * cancel loans; the accountant can see them.
 */
export function LoansPanel({ canManage }: { canManage: boolean }) {
  const [includeClosed, setIncludeClosed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<EmployeeLoanDto | null>(null);
  const [busy, setBusy] = useState(false);
  const { loans, loansLoading, loansError } = useGetLoans({ includeClosed });

  const onCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      await cancelLoan(cancelling.id);
      toast.success(`Loan for ${cancelling.employeeName} cancelled`);
      setCancelling(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel the loan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          p: 2.5,
          gap: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={includeClosed}
              onChange={(event) => setIncludeClosed(event.target.checked)}
            />
          }
          label="Show repaid and cancelled loans"
        />
        {canManage && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setCreating(true)}
          >
            New loan
          </Button>
        )}
      </Box>

      {loansError && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {loansError.message}
        </Alert>
      )}

      <Scrollbar>
        <Table sx={{ minWidth: 960 }}>
          <TableHeadCustom headCells={HEAD} rowCount={loans.length} />
          <TableBody>
            {loansLoading ? (
              <TableSkeleton rowCount={3} cellCount={HEAD.length} sx={{ height: 69 }} />
            ) : (
              loans.map((loan) => (
                <TableRow key={loan.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{loan.employeeName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {[loan.employeeCode, `added ${fDate(loan.createdAt)}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {fSalary(loan.principal)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {fSalary(loan.monthlyInstalment)} × {loan.instalments}{' '}
                      {loan.instalments === 1 ? 'month' : 'months'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      From {loan.startMonthLabel}
                      {loan.notes ? ` · ${loan.notes}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {loan.instalmentsPaid} of {loan.instalments} · {fSalary(loan.recovered)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      color={loan.status === 'COMPLETED' ? 'success' : 'primary'}
                      value={Math.min(100, (loan.recovered / loan.principal) * 100)}
                      sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                    {fSalary(loan.remaining)}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={STATUS[loan.status].color}>
                      {STATUS[loan.status].label}
                    </Label>
                  </TableCell>
                  <TableCell align="right">
                    {canManage && loan.status === 'ACTIVE' && (
                      <Button size="small" color="error" onClick={() => setCancelling(loan)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableNoData notFound={!loansLoading && !loans.length} />
          </TableBody>
        </Table>
      </Scrollbar>

      {creating && <NewLoanDialog onClose={() => setCreating(false)} />}

      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this loan?"
        content={
          cancelling
            ? `No more instalments will be deducted from ${cancelling.employeeName}'s salary. ${fSalary(cancelling.recovered)} already repaid stays on their slips; ${fSalary(cancelling.remaining)} will no longer be deducted.`
            : ''
        }
        action={
          <Button variant="contained" color="error" loading={busy} onClick={onCancel}>
            Cancel loan
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

function NewLoanDialog({ onClose }: { onClose: () => void }) {
  const [employee, setEmployee] = useState<UserDto | null>(null);
  const [search, setSearch] = useState('');
  const [principal, setPrincipal] = useState('');
  const [instalments, setInstalments] = useState('6');
  const [startMonth, setStartMonth] = useState(currentSalaryMonth());
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { users, usersLoading } = useGetUsers({ q: search.trim() || undefined, limit: 50 });

  const amount = Number(principal);
  const months = Number(instalments);
  const errors = {
    employee: employee ? null : 'Choose an employee',
    principal:
      !/^\d+(\.\d{1,2})?$/.test(principal.trim()) || !(amount > 0) ? 'Enter the loan amount' : null,
    instalments:
      !/^\d+$/.test(instalments.trim()) || months < 1 || months > 60 ? '1 to 60 months' : null,
    startMonth: /^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) ? null : 'Choose a month',
  };
  const valid = !Object.values(errors).some(Boolean);
  const monthly = valid ? loanMonthlyInstalment(amount, months) : 0;
  const lastMonth = (() => {
    if (!valid) return null;
    const [y, m] = startMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + months - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const show = (message: string | null) => (submitted ? message || undefined : undefined);

  const onSubmit = async () => {
    setSubmitted(true);
    if (!valid || !employee) return;
    setSaving(true);
    try {
      await createLoan({
        employeeId: employee.id,
        principal: amount,
        instalments: months,
        startMonth,
        notes: notes.trim() || undefined,
      });
      toast.success(`Loan added for ${employee.firstName} ${employee.lastName}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add the loan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New loan</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Autocomplete
            options={users}
            value={employee}
            loading={usersLoading}
            filterOptions={(options) => options}
            onInputChange={(_event, value, reason) => reason === 'input' && setSearch(value)}
            onChange={(_event, value) => setEmployee(value)}
            getOptionLabel={(u) =>
              `${u.firstName} ${u.lastName}${u.employeeCode ? ` (${u.employeeCode})` : ''}`
            }
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Employee"
                required
                error={!!show(errors.employee)}
                helperText={show(errors.employee)}
              />
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              required
              label="Loan amount"
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
              error={!!show(errors.principal)}
              helperText={show(errors.principal)}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
                htmlInput: { inputMode: 'decimal' },
              }}
            />
            <TextField
              fullWidth
              required
              label="Repay over"
              value={instalments}
              onChange={(event) => setInstalments(event.target.value)}
              error={!!show(errors.instalments)}
              helperText={show(errors.instalments)}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">months</InputAdornment> },
                htmlInput: { inputMode: 'numeric' },
              }}
            />
          </Stack>
          <TextField
            type="month"
            required
            label="First deduction from the salary of"
            value={startMonth}
            onChange={(event) => setStartMonth(event.target.value)}
            error={!!show(errors.startMonth)}
            helperText={show(errors.startMonth)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Notes"
            multiline
            minRows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          {valid && lastMonth && (
            <Alert severity="info">
              {fSalary(monthly)} will be deducted from each salary slip for {months}{' '}
              {months === 1 ? 'month' : 'months'}, {fSalaryMonth(startMonth)}
              {months > 1 ? ` to ${fSalaryMonth(lastMonth)}` : ''} (the last instalment evens out
              any rounding). If a month&apos;s slip isn&apos;t generated, the plan simply moves on
              to the next one.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" loading={saving} onClick={onSubmit}>
          Add loan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
