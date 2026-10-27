import type { UserDto } from 'src/types/user';
import type {
  SalarySlipDto,
  SalarySlipDefaults,
  SecurityDeductionMode,
} from 'src/actions/salary-slips';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetMailStatus } from 'src/actions/interviews';
import { useGetUser, useGetUsers } from 'src/actions/users';
import {
  fSalary,
  fSalaryMonth,
  calculatePayroll,
  createSalarySlip,
  currentSalaryMonth,
  previousSalaryMonth,
  SALARY_PAYMENT_METHODS,
  useGetSalarySlipDefaults,
  SALARY_SLIP_MANAGER_ROLES,
  SECURITY_DEDUCTION_OPTIONS,
} from 'src/actions/salary-slips';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { RoleBasedGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

import {
  SalarySlipPdfFrame,
  useSalarySlipActions,
  SalarySlipEmailStatus,
  SalarySlipPreviewDialog,
} from '../salary-slip-components';

// ----------------------------------------------------------------------

type FormState = {
  grossSalary: string;
  workingDays: string;
  unpaidDays: string;
  securityMode: SecurityDeductionMode;
  securityAmount: string;
  tax: string;
  /** '' = take the loan schedule's instalment. */
  loanOverride: string;
  nonTaxableAddition: string;
  taxableAddition: string;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  grossSalary: '',
  workingDays: '',
  unpaidDays: '',
  securityMode: 'NONE',
  securityAmount: '',
  tax: '',
  loanOverride: '',
  nonTaxableAddition: '',
  taxableAddition: '',
  paymentMethod: 'Bank transfer',
  paymentDate: '',
  notes: '',
};

const num = (value: string) => (value.trim() === '' ? 0 : Number(value));
const amountText = (value: number | null | undefined) => (value ? String(value) : '');

/**
 * Start from this month's payroll sheet row (the server fills a new month from the employee's
 * account — current salary — and last month's security deduction), plus the slip's payment
 * details when revising.
 */
function formFromDefaults(defaults: SalarySlipDefaults): FormState {
  const row = defaults.payroll;
  const existing = defaults.existing;
  const source = existing ?? defaults.previous;
  return {
    grossSalary: amountText(row.grossSalary),
    workingDays: String(row.workingDays || defaults.workingDays),
    unpaidDays: amountText(row.unpaidDays),
    securityMode: row.securityMode,
    securityAmount: amountText(row.securityAmount),
    tax: amountText(row.tax),
    loanOverride: row.loanOverride === null ? '' : String(row.loanOverride),
    nonTaxableAddition: amountText(row.nonTaxableAddition),
    taxableAddition: amountText(row.taxableAddition),
    paymentMethod:
      source?.paymentMethod ?? (defaults.employee.bankAccountNumberMasked ? 'Bank transfer' : ''),
    paymentDate: existing?.paymentDate ?? '',
    notes: existing?.notes ?? '',
  };
}

function amountError(value: string, required = false): string | null {
  if (value.trim() === '') return required ? 'Required' : null;
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Enter a number';
  if (n < 0) return 'Cannot be negative';
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return 'Up to 2 decimals';
  if (n > 100_000_000) return 'Too large';
  return null;
}

// ----------------------------------------------------------------------

/**
 * Generate a salary slip (HR / ADMIN) with the payroll sheet's formula: pick the employee + month
 * → the figures come from their payroll sheet row (gross salary, CNIC and bank from their
 * account; loan instalment from their loan) → totals update live → Generate stores the slip and
 * shows that employee's PDF to download, print or email.
 */
export function SalarySlipGenerateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: me } = useAuthContext();

  const [employeeId, setEmployeeId] = useState<number | null>(
    Number(searchParams.get('employeeId')) || null
  );
  const [month, setMonth] = useState(searchParams.get('month') || previousSalaryMonth());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  const [regenerate, setRegenerate] = useState(false);
  // Came here to revise a slip (history "Revise" link or "Revise this slip") — pre-tick Regenerate.
  const [reviseIntent, setReviseIntent] = useState(!!searchParams.get('employeeId'));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SalarySlipDto | null>(null);
  const [viewingExisting, setViewingExisting] = useState(false);

  const { users, usersLoading } = useGetUsers({ q: employeeSearch.trim() || undefined, limit: 50 });
  const { user: selectedUser } = useGetUser(employeeId ?? undefined);
  const monthValid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const { defaults, defaultsLoading, defaultsError } = useGetSalarySlipDefaults(
    employeeId,
    monthValid ? month : undefined
  );
  const { mailStatus } = useGetMailStatus();
  const actions = useSalarySlipActions(setResult);

  // Pre-fill once per employee + month, so a background refresh never wipes what HR typed.
  const defaultsKey = defaults ? `${defaults.employee.id}:${defaults.salaryMonth}` : null;
  useEffect(() => {
    if (defaults && defaultsKey !== prefilledFor) {
      setForm(formFromDefaults(defaults));
      setPrefilledFor(defaultsKey);
      setRegenerate(reviseIntent && !!defaults.existing);
      setSubmitted(false);
    }
  }, [defaults, defaultsKey, prefilledFor, reviseIntent]);

  const employeeOptions = useMemo(() => {
    const list = [...users];
    if (selectedUser && !list.some((u) => u.id === selectedUser.id)) list.unshift(selectedUser);
    return list;
  }, [users, selectedUser]);
  const selectedOption = employeeOptions.find((u) => u.id === employeeId) ?? null;

  const loan = defaults?.loan ?? null;
  const loanDeduction =
    form.loanOverride.trim() === '' ? (loan?.amount ?? 0) : num(form.loanOverride);
  const totals = calculatePayroll({
    grossSalary: num(form.grossSalary),
    workingDays: num(form.workingDays),
    unpaidDays: num(form.unpaidDays),
    securityMode: form.securityMode,
    securityAmount: num(form.securityAmount),
    tax: num(form.tax),
    loanDeduction,
    nonTaxableAddition: num(form.nonTaxableAddition),
    taxableAddition: num(form.taxableAddition),
    paid: 0,
  });

  // ---- Validation ----------------------------------------------------------------------------
  const daysInMonth = defaults?.daysInMonth ?? 31;
  const joinMonth = defaults?.employee.joinDate?.slice(0, 7) ?? null;
  const workingDaysNum = num(form.workingDays);
  const errors = {
    month: !monthValid
      ? 'Choose a month'
      : month > currentSalaryMonth()
        ? 'Cannot be a future month'
        : joinMonth && month < joinMonth
          ? `Employee joined ${fDate(defaults?.employee.joinDate)}`
          : null,
    grossSalary: amountError(form.grossSalary, true),
    workingDays:
      !/^\d+$/.test(form.workingDays.trim()) || workingDaysNum < 1 || workingDaysNum > daysInMonth
        ? `1–${daysInMonth}`
        : null,
    unpaidDays:
      form.unpaidDays.trim() === ''
        ? null
        : !/^\d+(\.\d{1,2})?$/.test(form.unpaidDays.trim())
          ? 'Enter days, e.g. 2.5'
          : num(form.unpaidDays) > workingDaysNum
            ? 'More than the working days'
            : null,
    securityAmount: form.securityMode === 'MANUAL' ? amountError(form.securityAmount, true) : null,
    loanOverride:
      amountError(form.loanOverride) ??
      (form.loanOverride.trim() !== '' && num(form.loanOverride) > 0 && !loan
        ? 'No loan to repay this month'
        : loan && num(form.loanOverride) > loan.remainingBefore
          ? `Only ${fSalary(loan.remainingBefore)} left`
          : null),
    nonTaxableAddition: amountError(form.nonTaxableAddition),
    taxableAddition: amountError(form.taxableAddition),
  };
  const fieldErrors = Object.values(errors).filter(Boolean);
  const totalsError =
    totals.totalEarnings <= 0
      ? 'Total earnings must be more than zero.'
      : totals.netSalary < 0
        ? 'Deductions are more than the total earnings.'
        : null;
  const needsRegenerateTick = !!defaults?.existing && !regenerate;
  const canSubmit =
    !!employeeId &&
    !!defaults &&
    !defaultsLoading &&
    !fieldErrors.length &&
    !totalsError &&
    !needsRegenerateTick;
  const show = (message: string | null | undefined) =>
    submitted ? message || undefined : undefined;

  // ---- Form helpers --------------------------------------------------------------------------
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startOver = () => {
    setResult(null);
    setEmployeeId(null);
    setForm(EMPTY_FORM);
    setPrefilledFor(null);
    setRegenerate(false);
    setReviseIntent(false);
    setSubmitted(false);
    router.replace(paths.dashboard.salarySlips.new);
  };

  const onGenerate = async () => {
    setSubmitted(true);
    if (!canSubmit || !employeeId) {
      toast.error(
        needsRegenerateTick
          ? 'A slip already exists for this month — tick "Regenerate" to replace it'
          : 'Please fix the highlighted fields'
      );
      return;
    }
    setSaving(true);
    try {
      const slip = await createSalarySlip({
        employeeId,
        salaryMonth: month,
        basicSalary: num(form.grossSalary),
        workingDays: workingDaysNum,
        unpaidDays: num(form.unpaidDays),
        securityMode: form.securityMode,
        securityAmount: form.securityMode === 'MANUAL' ? num(form.securityAmount) : undefined,
        loanDeduction: form.loanOverride.trim() === '' ? undefined : num(form.loanOverride),
        nonTaxableAddition: num(form.nonTaxableAddition),
        taxableAddition: num(form.taxableAddition),
        paymentMethod: form.paymentMethod || undefined,
        paymentDate: form.paymentDate || undefined,
        notes: form.notes.trim() || undefined,
        regenerate: regenerate || undefined,
      });
      // Straight to the chosen employee's slip.
      setResult(slip);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(
        slip.revision > 1
          ? `Revised salary slip generated for ${slip.employeeName} (revision ${slip.revision})`
          : `Salary slip generated for ${slip.employeeName}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate the salary slip');
    } finally {
      setSaving(false);
    }
  };

  const mailWarning =
    mailStatus && !mailStatus.connected
      ? mailStatus.configured
        ? `The email server is not reachable right now${mailStatus.error ? ` (${mailStatus.error})` : ''} — sending will be recorded as Failed and you can resend later.`
        : 'Email (SMTP) is not set up on the server, so salary slips cannot be emailed yet. You can still generate, download and print them.'
      : null;

  // ---- Render --------------------------------------------------------------------------------
  const amountField = (
    key: keyof FormState,
    label: string,
    error: string | null,
    extra: { required?: boolean; helperText?: string; placeholder?: string } = {}
  ) => (
    <TextField
      fullWidth
      label={label}
      value={form[key]}
      required={extra.required}
      placeholder={extra.placeholder}
      onChange={(event) => set(key, event.target.value as never)}
      error={!!show(error)}
      helperText={show(error) ?? extra.helperText}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
        htmlInput: { inputMode: 'decimal' },
        ...(extra.placeholder && { inputLabel: { shrink: true } }),
      }}
    />
  );

  const summaryRow = (
    label: string,
    value: number,
    opts: { bold?: boolean; negative?: boolean } = {}
  ) => (
    <Stack
      direction="row"
      justifyContent="space-between"
      sx={{ typography: opts.bold ? 'subtitle2' : 'body2' }}
    >
      <Box component="span" sx={{ color: opts.bold ? 'text.primary' : 'text.secondary' }}>
        {label}
      </Box>
      <Box component="span" sx={{ ...(opts.negative && { color: 'error.main' }) }}>
        {opts.negative && value ? '− ' : ''}
        {fSalary(value)}
      </Box>
    </Stack>
  );

  return (
    <RoleBasedGuard
      hasContent
      currentRole={me?.role ?? ''}
      allowedRoles={SALARY_SLIP_MANAGER_ROLES}
    >
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Generate salary slip"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Salary slips', href: paths.dashboard.salarySlips.root },
            { name: 'Generate' },
          ]}
          sx={{ mb: 3 }}
        />

        {mailWarning && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {mailWarning}
          </Alert>
        )}

        {result ? (
          <ResultPanel
            slip={result}
            actions={actions}
            onGenerateAnother={startOver}
            onRevise={() => {
              setResult(null);
              setReviseIntent(true);
              setPrefilledFor(null);
            }}
          />
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                {/* ---- Step 1: employee + month ---- */}
                <Card>
                  <CardHeader title="1. Employee & salary month" />
                  <CardContent>
                    <Stack spacing={2.5}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Autocomplete
                          fullWidth
                          options={employeeOptions}
                          value={selectedOption}
                          loading={usersLoading}
                          filterOptions={(options) => options}
                          onInputChange={(_event, value, reason) => {
                            if (reason === 'input') setEmployeeSearch(value);
                          }}
                          onChange={(_event, value: UserDto | null) => {
                            setEmployeeId(value?.id ?? null);
                            setReviseIntent(false);
                            setPrefilledFor(null);
                          }}
                          getOptionLabel={(u) =>
                            `${u.firstName} ${u.lastName}${u.employeeCode ? ` (${u.employeeCode})` : ''}`
                          }
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          renderOption={(props, u) => (
                            <li {...props} key={u.id}>
                              <Stack>
                                <Typography variant="body2">
                                  {`${u.firstName} ${u.lastName}`}
                                  {u.status === 'INACTIVE' ? ' (removed)' : ''}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {[u.employeeCode, u.designation, u.departmentName]
                                    .filter(Boolean)
                                    .join(' · ') || u.email}
                                </Typography>
                              </Stack>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Employee"
                              required
                              placeholder="Search by name, email or ID"
                              error={submitted && !employeeId}
                              helperText={
                                submitted && !employeeId ? 'Choose an employee' : undefined
                              }
                            />
                          )}
                        />
                        <TextField
                          type="month"
                          label="Salary month"
                          required
                          value={month}
                          onChange={(event) => {
                            setMonth(event.target.value);
                            setReviseIntent(false);
                            setPrefilledFor(null);
                          }}
                          error={!!errors.month && (submitted || month !== '')}
                          helperText={errors.month ?? undefined}
                          slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: { max: currentSalaryMonth() },
                          }}
                          sx={{ width: { xs: 1, sm: 220 }, flexShrink: 0 }}
                        />
                      </Stack>

                      {employeeId && defaultsLoading && !defaults && (
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <CircularProgress size={20} />
                          <Typography variant="body2">Loading employee details…</Typography>
                        </Stack>
                      )}
                      {defaultsError && <Alert severity="error">{defaultsError.message}</Alert>}

                      {defaults && <EmployeeDetails defaults={defaults} />}

                      {defaults?.existing && (
                        <Alert
                          severity="warning"
                          action={
                            <Button
                              color="inherit"
                              size="small"
                              onClick={() => setViewingExisting(true)}
                            >
                              View
                            </Button>
                          }
                        >
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {defaults.employee.name} already has a salary slip for{' '}
                            {fSalaryMonth(defaults.salaryMonth)} ({defaults.existing.reference}, net{' '}
                            {fSalary(defaults.existing.netSalary)}, generated{' '}
                            {fDate(defaults.existing.createdAt)}, email{' '}
                            {defaults.existing.emailStatus === 'SENT'
                              ? 'sent'
                              : defaults.existing.emailStatus === 'FAILED'
                                ? 'failed'
                                : 'not sent'}
                            ).
                          </Typography>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={regenerate}
                                onChange={(event) => setRegenerate(event.target.checked)}
                              />
                            }
                            label="Regenerate — replace it with a revised slip (the old one is kept in history)"
                          />
                        </Alert>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                {/* ---- Step 2: figures (the payroll sheet's columns) ---- */}
                {defaults && (
                  <Card>
                    <CardHeader
                      title="2. Salary details"
                      subheader={
                        defaults.payroll.saved
                          ? `From ${defaults.employee.name}'s row on the ${fSalaryMonth(defaults.salaryMonth)} payroll sheet.`
                          : defaults.employee.currentSalary !== null
                            ? 'Gross salary is from the employee’s account. Enter this month’s unpaid holidays and additions; the accountant enters the tax.'
                            : 'No salary on the employee’s account yet — enter the gross salary.'
                      }
                    />
                    <CardContent>
                      <Stack spacing={3}>
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                          Salary & attendance
                        </Typography>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          sx={{ mt: '0 !important' }}
                        >
                          {amountField('grossSalary', 'Gross salary', errors.grossSalary, {
                            required: true,
                          })}
                          <TextField
                            fullWidth
                            required
                            label="Working days"
                            value={form.workingDays}
                            onChange={(event) => set('workingDays', event.target.value)}
                            error={!!show(errors.workingDays)}
                            helperText={
                              show(errors.workingDays) ?? `Per day ${fSalary(totals.perDaySalary)}`
                            }
                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                          />
                          <TextField
                            fullWidth
                            label="Unpaid holidays"
                            value={form.unpaidDays}
                            onChange={(event) => set('unpaidDays', event.target.value)}
                            error={!!show(errors.unpaidDays)}
                            helperText={
                              show(errors.unpaidDays) ??
                              (totals.unpaidDeduction
                                ? `− ${fSalary(totals.unpaidDeduction)}`
                                : 'Days, half days allowed')
                            }
                            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                          />
                        </Stack>

                        <Divider />
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                          Deductions
                        </Typography>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          sx={{ mt: '0 !important' }}
                        >
                          <TextField
                            select
                            fullWidth
                            label="Security deduction"
                            value={form.securityMode}
                            onChange={(event) =>
                              set('securityMode', event.target.value as SecurityDeductionMode)
                            }
                            helperText={
                              form.securityMode !== 'MANUAL' && totals.securityDeduction
                                ? `− ${fSalary(totals.securityDeduction)}`
                                : ' '
                            }
                          >
                            {SECURITY_DEDUCTION_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                          {form.securityMode === 'MANUAL' &&
                            amountField(
                              'securityAmount',
                              'Security amount',
                              errors.securityAmount,
                              {
                                required: true,
                              }
                            )}
                          <TextField
                            fullWidth
                            disabled
                            label="Tax"
                            value={fSalary(num(form.tax))}
                            helperText="Entered by the accountant only, on the payroll sheet"
                          />
                        </Stack>
                        {amountField('loanOverride', 'Loan deduction', errors.loanOverride, {
                          placeholder: loan ? `${fSalary(loan.amount)} (scheduled)` : 'No loan',
                          helperText: loan
                            ? `Instalment ${loan.instalmentNo} of ${loan.instalments} — ${fSalary(loan.remainingBefore)} still owed of ${fSalary(loan.principal)}. Leave empty to take the scheduled instalment.`
                            : 'No loan for this employee. Add one under Salary slips → Loans.',
                        })}

                        <Divider />
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                          Additions
                        </Typography>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          sx={{ mt: '0 !important' }}
                        >
                          {amountField(
                            'nonTaxableAddition',
                            'Non-taxable addition',
                            errors.nonTaxableAddition
                          )}
                          {amountField(
                            'taxableAddition',
                            'Taxable addition',
                            errors.taxableAddition
                          )}
                        </Stack>

                        <Divider />
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                          Payment information
                        </Typography>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          sx={{ mt: '0 !important' }}
                        >
                          <TextField
                            select
                            fullWidth
                            label="Payment method"
                            value={form.paymentMethod}
                            onChange={(event) => set('paymentMethod', event.target.value)}
                          >
                            <MenuItem value="">Not specified</MenuItem>
                            {SALARY_PAYMENT_METHODS.map((method) => (
                              <MenuItem key={method} value={method}>
                                {method}
                              </MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            fullWidth
                            type="date"
                            label="Payment date"
                            value={form.paymentDate}
                            onChange={(event) => set('paymentDate', event.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                        </Stack>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label="Notes (printed on the slip)"
                          value={form.notes}
                          onChange={(event) => set('notes', event.target.value)}
                          slotProps={{ htmlInput: { maxLength: 1000 } }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>

            {/* ---- Live summary ---- */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
                <CardHeader title="Salary calculation" />
                <CardContent>
                  <Stack spacing={1.25}>
                    {summaryRow('Gross salary', num(form.grossSalary) || 0)}
                    {summaryRow('Non-taxable addition', num(form.nonTaxableAddition) || 0)}
                    {summaryRow('Taxable addition', num(form.taxableAddition) || 0)}
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    {summaryRow('Total earnings', totals.totalEarnings, { bold: true })}
                    {summaryRow('Unpaid holidays', totals.unpaidDeduction, { negative: true })}
                    {summaryRow('Security deduction', totals.securityDeduction, { negative: true })}
                    {summaryRow('Tax', num(form.tax) || 0, { negative: true })}
                    {summaryRow('Loan deduction', loanDeduction || 0, { negative: true })}
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    {summaryRow('Total deductions', totals.totalDeductions, {
                      bold: true,
                      negative: true,
                    })}
                    {summaryRow('Taxable salary', totals.taxableSalary)}
                    <Box
                      sx={{
                        mt: 1,
                        p: 2,
                        borderRadius: 1.5,
                        bgcolor: totals.netSalary < 0 ? 'error.lighter' : 'success.lighter',
                      }}
                    >
                      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                        Net salary
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ color: totals.netSalary < 0 ? 'error.dark' : 'success.darker' }}
                      >
                        {fSalary(totals.netSalary)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Net = Gross − Unpaid holidays − Security − Tax − Loan + Non-taxable addition +
                      Taxable addition. Unpaid holidays = Gross ÷ Working days × Unpaid days.
                    </Typography>

                    {submitted && totalsError && <Alert severity="error">{totalsError}</Alert>}

                    <Button
                      fullWidth
                      size="large"
                      variant="contained"
                      loading={saving}
                      disabled={!defaults || defaultsLoading}
                      startIcon={<Iconify icon="solar:file-text-bold" />}
                      onClick={onGenerate}
                      sx={{ mt: 1 }}
                    >
                      {regenerate && defaults?.existing
                        ? 'Regenerate salary slip'
                        : 'Generate salary slip'}
                    </Button>
                    {!employeeId && (
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', textAlign: 'center' }}
                      >
                        Choose an employee to start.
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {viewingExisting && defaults?.existing && (
          <SalarySlipPreviewDialog
            slip={defaults.existing}
            canSend
            onClose={() => setViewingExisting(false)}
          />
        )}
      </DashboardContent>
    </RoleBasedGuard>
  );
}

// ----------------------------------------------------------------------

function EmployeeDetails({ defaults }: { defaults: SalarySlipDefaults }) {
  const { employee } = defaults;
  const rows: [string, string][] = [
    ['Staff ID', employee.employeeCode ?? '—'],
    ['ID card number', employee.nationalId ?? 'Not on file'],
    ['Designation', employee.designation ?? '—'],
    ['Department', employee.departmentName ?? '—'],
    ['Registered email', employee.email],
    [
      'Bank account',
      employee.bankName || employee.bankAccountNumberMasked
        ? [employee.bankName, employee.bankAccountNumberMasked].filter(Boolean).join(' · ')
        : 'Not on file',
    ],
    ['Joined', employee.joinDate ? fDate(employee.joinDate) : '—'],
    [
      'Current salary',
      employee.currentSalary !== null ? fSalary(employee.currentSalary) : 'Not on file',
    ],
    ['Deduction policy', employee.deductionPolicy || '—'],
  ];
  return (
    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1, mb: 1.5 }}>
        <Iconify icon="solar:user-id-bold" />
        <Typography variant="subtitle1">{employee.name}</Typography>
        {employee.status === 'INACTIVE' && (
          <Label color="warning" variant="soft">
            Removed
          </Label>
        )}
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        }}
      >
        {rows.map(([label, value]) => (
          <Box key={label}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

type ResultPanelProps = {
  slip: SalarySlipDto;
  actions: ReturnType<typeof useSalarySlipActions>;
  onGenerateAnother: () => void;
  onRevise: () => void;
};

/** Step 3: the generated PDF with Download / Print / Send. */
function ResultPanel({ slip, actions, onGenerateAnother, onRevise }: ResultPanelProps) {
  const sendLabel = slip.emailStatus === 'NOT_SENT' ? 'Send salary slip' : 'Resend';
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardHeader
            title="3. Preview"
            subheader={`${slip.reference} · ${slip.employeeName} · ${slip.salaryMonthLabel}`}
          />
          <CardContent>
            <SalarySlipPdfFrame slipId={slip.id} height={760} />
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
          <CardHeader title="Salary slip ready" action={<SalarySlipEmailStatus slip={slip} />} />
          <CardContent>
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total earnings
                  </Typography>
                  <Typography variant="body2">{fSalary(slip.grossSalary)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total deductions
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'error.main' }}>
                    − {fSalary(slip.totalDeductions)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">Net salary</Typography>
                  <Typography variant="subtitle1">{fSalary(slip.netSalary)}</Typography>
                </Stack>
              </Stack>

              {slip.emailStatus === 'SENT' && (
                <Alert severity="success">
                  Emailed to {slip.emailedTo}
                  {slip.emailSentAt ? ` on ${fDate(slip.emailSentAt)}` : ''}.
                </Alert>
              )}
              {slip.emailStatus === 'FAILED' && (
                <Alert severity="error">
                  The email could not be sent: {slip.emailError ?? 'unknown error'}. Check the email
                  settings and resend.
                </Alert>
              )}
              {slip.emailStatus === 'NOT_SENT' && (
                <Alert severity="info">
                  Check the PDF, then send it. It goes to the employee&apos;s registered email
                  address as a PDF attachment.
                </Alert>
              )}

              <Button
                fullWidth
                size="large"
                variant="contained"
                color={slip.emailStatus === 'FAILED' ? 'error' : 'primary'}
                startIcon={
                  <Iconify
                    icon={
                      slip.emailStatus === 'NOT_SENT' ? 'custom:send-fill' : 'solar:restart-bold'
                    }
                  />
                }
                loading={actions.isPending(slip, 'send')}
                disabled={actions.busy}
                onClick={() => actions.run(slip, 'send')}
              >
                {sendLabel}
              </Button>
              <Stack direction="row" spacing={1.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Iconify icon="solar:download-bold" />}
                  loading={actions.isPending(slip, 'download')}
                  disabled={actions.busy}
                  onClick={() => actions.run(slip, 'download')}
                >
                  Download
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
                  loading={actions.isPending(slip, 'print')}
                  disabled={actions.busy}
                  onClick={() => actions.run(slip, 'print')}
                >
                  Print
                </Button>
              </Stack>

              <Divider />
              <Button
                color="inherit"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={onRevise}
              >
                Something wrong? Revise this slip
              </Button>
              <Button
                color="inherit"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={onGenerateAnother}
              >
                Generate another salary slip
              </Button>
              <Button
                component={RouterLink}
                href={paths.dashboard.salarySlips.root}
                color="inherit"
                startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              >
                Salary slip history
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
