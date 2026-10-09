import type { UserDto } from 'src/types/user';
import type { SalarySlipDto, SalarySlipDefaults } from 'src/actions/salary-slips';

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
import IconButton from '@mui/material/IconButton';
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
  calculateSalary,
  createSalarySlip,
  currentSalaryMonth,
  previousSalaryMonth,
  SALARY_PAYMENT_METHODS,
  useGetSalarySlipDefaults,
  SALARY_SLIP_MANAGER_ROLES,
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

type LineItemField = { key: number; label: string; amount: string };

type FormState = {
  basicSalary: string;
  allowances: LineItemField[];
  bonus: string;
  overtime: string;
  deductions: LineItemField[];
  tax: string;
  paymentMethod: string;
  paymentDate: string;
  workingDays: string;
  notes: string;
};

const MAX_ITEMS = 12;
let nextKey = 1;
const item = (label = '', amount = ''): LineItemField => ({ key: nextKey++, label, amount });

const EMPTY_FORM: FormState = {
  basicSalary: '',
  allowances: [],
  bonus: '',
  overtime: '',
  deductions: [],
  tax: '',
  paymentMethod: 'Bank transfer',
  paymentDate: '',
  workingDays: '',
  notes: '',
};

const num = (value: string) => (value.trim() === '' ? 0 : Number(value));
const amountText = (value: number) => (value ? String(value) : '');

/** Start from this month's slip (when revising) or the employee's last slip. */
function formFromDefaults(defaults: SalarySlipDefaults): FormState {
  const source = defaults.existing ?? defaults.previous;
  if (!source) {
    return {
      ...EMPTY_FORM,
      // No earlier slip — start from the salary on the employee's record.
      basicSalary: amountText(defaults.employee.currentSalary ?? 0),
      paymentMethod: defaults.employee.bankAccountNumberMasked ? 'Bank transfer' : '',
    };
  }
  const sameMonth = source.salaryMonth === defaults.salaryMonth;
  return {
    basicSalary: amountText(source.basicSalary),
    allowances: source.allowances.map((a) => item(a.label, String(a.amount))),
    // Bonus / overtime / working days / payment date / notes change month to month.
    bonus: sameMonth ? amountText(source.bonus) : '',
    overtime: sameMonth ? amountText(source.overtime) : '',
    deductions: source.deductions.map((d) => item(d.label, String(d.amount))),
    tax: amountText(source.tax),
    paymentMethod: source.paymentMethod ?? '',
    paymentDate: sameMonth ? (source.paymentDate ?? '') : '',
    workingDays: sameMonth && source.workingDays !== null ? String(source.workingDays) : '',
    notes: sameMonth ? (source.notes ?? '') : '',
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
 * Generate a salary slip (HR / ADMIN): pick the employee + month → the form is pre-filled from
 * their last slip → totals update live → Generate stores the slip and its PDF → preview, download,
 * print and email it to the employee's registered address from the same page.
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

  const totals = calculateSalary({
    basicSalary: num(form.basicSalary),
    allowances: form.allowances.map((a) => ({ label: a.label, amount: num(a.amount) })),
    bonus: num(form.bonus),
    overtime: num(form.overtime),
    deductions: form.deductions.map((d) => ({ label: d.label, amount: num(d.amount) })),
    tax: num(form.tax),
  });

  // ---- Validation ----------------------------------------------------------------------------
  const daysInMonth = defaults?.daysInMonth ?? 31;
  const joinMonth = defaults?.employee.joinDate?.slice(0, 7) ?? null;
  const errors = {
    month: !monthValid
      ? 'Choose a month'
      : month > currentSalaryMonth()
        ? 'Cannot be a future month'
        : joinMonth && month < joinMonth
          ? `Employee joined ${fDate(defaults?.employee.joinDate)}`
          : null,
    basicSalary: amountError(form.basicSalary, true),
    bonus: amountError(form.bonus),
    overtime: amountError(form.overtime),
    tax: amountError(form.tax),
    workingDays:
      form.workingDays.trim() === ''
        ? null
        : !/^\d+$/.test(form.workingDays.trim()) || Number(form.workingDays) > daysInMonth
          ? `0–${daysInMonth}`
          : null,
    allowances: form.allowances.map((a) => ({
      label: a.label.trim() ? null : 'Name required',
      amount: amountError(a.amount, true),
    })),
    deductions: form.deductions.map((d) => ({
      label: d.label.trim() ? null : 'Name required',
      amount: amountError(d.amount, true),
    })),
  };
  const fieldErrors = [
    errors.month,
    errors.basicSalary,
    errors.bonus,
    errors.overtime,
    errors.tax,
    errors.workingDays,
    ...errors.allowances.flatMap((e) => [e.label, e.amount]),
    ...errors.deductions.flatMap((e) => [e.label, e.amount]),
  ].filter(Boolean);
  const totalsError =
    totals.grossSalary <= 0
      ? 'The gross salary must be more than zero.'
      : totals.netSalary < 0
        ? 'Deductions are more than the gross salary.'
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
  const updateItem = (
    list: 'allowances' | 'deductions',
    key: number,
    patch: Partial<LineItemField>
  ) =>
    setForm((prev) => ({
      ...prev,
      [list]: prev[list].map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    }));
  const removeItem = (list: 'allowances' | 'deductions', key: number) =>
    setForm((prev) => ({ ...prev, [list]: prev[list].filter((entry) => entry.key !== key) }));
  const addItem = (list: 'allowances' | 'deductions') =>
    setForm((prev) => ({ ...prev, [list]: [...prev[list], item()] }));

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
        basicSalary: num(form.basicSalary),
        allowances: form.allowances.map((a) => ({ label: a.label.trim(), amount: num(a.amount) })),
        bonus: num(form.bonus),
        overtime: num(form.overtime),
        deductions: form.deductions.map((d) => ({ label: d.label.trim(), amount: num(d.amount) })),
        tax: num(form.tax),
        paymentMethod: form.paymentMethod || undefined,
        paymentDate: form.paymentDate || undefined,
        workingDays: form.workingDays.trim() ? Number(form.workingDays) : undefined,
        notes: form.notes.trim() || undefined,
        regenerate: regenerate || undefined,
      });
      setResult(slip);
      toast.success(
        slip.revision > 1
          ? `Revised salary slip generated (revision ${slip.revision})`
          : 'Salary slip generated'
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
    label: string,
    value: string,
    onChange: (value: string) => void,
    error: string | null,
    extra: { required?: boolean; helperText?: string } = {}
  ) => (
    <TextField
      fullWidth
      label={label}
      value={value}
      required={extra.required}
      onChange={(event) => onChange(event.target.value)}
      error={!!show(error)}
      helperText={show(error) ?? extra.helperText}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
        htmlInput: { inputMode: 'decimal' },
      }}
    />
  );

  const lineItems = (list: 'allowances' | 'deductions', placeholder: string) => (
    <Stack spacing={1.5}>
      {form[list].map((entry, i) => (
        <Stack key={entry.key} direction="row" spacing={1} alignItems="flex-start">
          <TextField
            size="small"
            label="Name"
            placeholder={placeholder}
            value={entry.label}
            onChange={(event) => updateItem(list, entry.key, { label: event.target.value })}
            error={!!show(errors[list][i]?.label)}
            helperText={show(errors[list][i]?.label)}
            slotProps={{ htmlInput: { maxLength: 60 } }}
            sx={{ flex: 1.4 }}
          />
          <TextField
            size="small"
            label="Amount"
            value={entry.amount}
            onChange={(event) => updateItem(list, entry.key, { amount: event.target.value })}
            error={!!show(errors[list][i]?.amount)}
            helperText={show(errors[list][i]?.amount)}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
              htmlInput: { inputMode: 'decimal' },
            }}
            sx={{ flex: 1 }}
          />
          <IconButton color="error" onClick={() => removeItem(list, entry.key)} sx={{ mt: 0.5 }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Stack>
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<Iconify icon="mingcute:add-line" />}
          disabled={form[list].length >= MAX_ITEMS}
          onClick={() => addItem(list)}
        >
          {list === 'allowances' ? 'Add allowance' : 'Add deduction'}
        </Button>
      </Box>
    </Stack>
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

                {/* ---- Step 2: figures ---- */}
                {defaults && (
                  <Card>
                    <CardHeader
                      title="2. Salary details"
                      subheader={
                        defaults.existing
                          ? `Pre-filled from the current ${fSalaryMonth(defaults.salaryMonth)} slip.`
                          : defaults.previous
                            ? `Pre-filled from the ${defaults.previous.salaryMonthLabel} slip — check bonus and overtime for this month.`
                            : defaults.employee.currentSalary !== null
                              ? 'No earlier salary slip — basic salary starts from the current salary on their record. Add allowances and deductions.'
                              : 'No earlier salary slip for this employee — enter the figures.'
                      }
                    />
                    <CardContent>
                      <Stack spacing={3}>
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                          Earnings
                        </Typography>
                        <Box sx={{ mt: '0 !important' }}>
                          {amountField(
                            'Basic salary',
                            form.basicSalary,
                            (v) => set('basicSalary', v),
                            errors.basicSalary,
                            { required: true }
                          )}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                            Allowances
                          </Typography>
                          {lineItems('allowances', 'e.g. House rent')}
                        </Box>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          {amountField('Bonus', form.bonus, (v) => set('bonus', v), errors.bonus)}
                          {amountField(
                            'Overtime',
                            form.overtime,
                            (v) => set('overtime', v),
                            errors.overtime
                          )}
                        </Stack>

                        <Divider />
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                          Deductions
                        </Typography>
                        <Box sx={{ mt: '0 !important' }}>
                          {lineItems('deductions', 'e.g. Provident fund')}
                        </Box>
                        {amountField('Income tax', form.tax, (v) => set('tax', v), errors.tax)}

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
                          <TextField
                            fullWidth
                            label="Working days"
                            value={form.workingDays}
                            onChange={(event) => set('workingDays', event.target.value)}
                            error={!!show(errors.workingDays)}
                            helperText={show(errors.workingDays) ?? `Out of ${daysInMonth}`}
                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
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
                    {summaryRow('Basic salary', num(form.basicSalary) || 0)}
                    {summaryRow('Allowances', totals.totalAllowances)}
                    {summaryRow('Bonus', num(form.bonus) || 0)}
                    {summaryRow('Overtime', num(form.overtime) || 0)}
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    {summaryRow('Gross salary', totals.grossSalary, { bold: true })}
                    {summaryRow('Deductions', totals.totalDeductions - (num(form.tax) || 0), {
                      negative: true,
                    })}
                    {summaryRow('Income tax', num(form.tax) || 0, { negative: true })}
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    {summaryRow('Total deductions', totals.totalDeductions, {
                      bold: true,
                      negative: true,
                    })}
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
                      Gross = Basic + Allowances + Bonus + Overtime. Net = Gross − Total deductions.
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
    ['Employee ID', employee.employeeCode ?? '—'],
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
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
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
                    Gross salary
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
