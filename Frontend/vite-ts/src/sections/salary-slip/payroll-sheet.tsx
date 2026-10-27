import type {
  PayrollRow,
  SalarySlipDto,
  PayrollEntryPatch,
  PayrollEntryInputs,
  SecurityDeductionMode,
} from 'src/actions/salary-slips';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import {
  fSalary,
  fetchSalarySlip,
  calculatePayroll,
  EMAIL_STATUS_LABEL,
  currentSalaryMonth,
  updatePayrollEntry,
  useGetPayrollSheet,
  exportPayrollSheet,
  setPayrollWorkingDays,
  generateSlipFromPayroll,
  SECURITY_DEDUCTION_OPTIONS,
} from 'src/actions/salary-slips';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { SalarySlipPreviewDialog } from './salary-slip-components';

// ----------------------------------------------------------------------

const EMAIL_STATUS_COLOR = { NOT_SENT: 'default', SENT: 'success', FAILED: 'error' } as const;

type Draft = Record<Exclude<keyof PayrollEntryInputs, 'securityMode' | 'loanOverride'>, string> & {
  securityMode: SecurityDeductionMode;
  loanOverride: string;
};

const text = (value: number) => (value ? String(value) : '');

const draftFrom = (inputs: PayrollEntryInputs): Draft => ({
  grossSalary: text(inputs.grossSalary),
  workingDays: String(inputs.workingDays),
  unpaidDays: text(inputs.unpaidDays),
  securityMode: inputs.securityMode,
  securityAmount: text(inputs.securityAmount),
  tax: text(inputs.tax),
  loanOverride: inputs.loanOverride === null ? '' : String(inputs.loanOverride),
  nonTaxableAddition: text(inputs.nonTaxableAddition),
  taxableAddition: text(inputs.taxableAddition),
  paid: text(inputs.paid),
});

const num = (value: string) => (value.trim() === '' ? 0 : Number(value));
const AMOUNT = /^\d+(\.\d{1,2})?$/;

/** The money cells, money-formatted; Rs prefix comes from the column header. */
const money = (value: number) => fSalary(value).replace(/^Rs /, '');

// ----------------------------------------------------------------------

/**
 * The monthly payroll sheet, laid out like "Payroll for IT.xlsx": Staff ID, name, ID card number,
 * bank details, gross / taxable salary, the deductions (unpaid holidays, security, tax, loan), the
 * additions, net salary, paid and balance, with a totals row. Cells save when you leave them. HR /
 * Admin can edit every cell and generate each employee's slip from their row; the accountant fills
 * in Tax and Paid.
 */
export function PayrollSheetPanel() {
  const [month, setMonth] = useState(currentSalaryMonth());
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [applyingDays, setApplyingDays] = useState(false);
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportPayrollSheet(month);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export the Excel file');
    } finally {
      setExporting(false);
    }
  };
  const [viewing, setViewing] = useState<SalarySlipDto | number | null>(null);
  const closeViewing = useCallback(() => setViewing(null), []);
  const monthValid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const { sheet, sheetLoading, sheetError } = useGetPayrollSheet(monthValid ? month : undefined);

  const canEditAll = sheet?.editable === 'ALL';
  const canEditTax = !!sheet?.canEditTax;
  useEffect(() => {
    if (sheet) setWorkingDays(String(sheet.workingDays));
  }, [sheet?.month, sheet?.workingDays, sheet]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set((sheet?.rows ?? []).map((r) => r.departmentName).filter(Boolean))
      ).sort() as string[],
    [sheet?.rows]
  );
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sheet?.rows ?? []).filter(
      (r) =>
        (!department || r.departmentName === department) &&
        (!q ||
          [r.employeeName, r.staffId, r.nationalId, r.departmentName]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q)))
    );
  }, [sheet?.rows, search, department]);
  const filtered = rows.length !== (sheet?.rows.length ?? 0);

  // Totals of the rows shown (the server's totals when nothing is filtered out).
  const totals = useMemo(() => {
    if (!sheet || !filtered) return sheet?.totals;
    const sum = (pick: (r: PayrollRow) => number) =>
      rows.reduce((acc, r) => acc + Math.round(pick(r) * 100), 0) / 100;
    return {
      grossSalary: sum((r) => r.inputs.grossSalary),
      taxableSalary: sum((r) => r.calc.taxableSalary),
      unpaidDeduction: sum((r) => r.calc.unpaidDeduction),
      securityDeduction: sum((r) => r.calc.securityDeduction),
      tax: sum((r) => r.inputs.tax),
      loanDeduction: sum((r) => r.loanDeduction),
      nonTaxableAddition: sum((r) => r.inputs.nonTaxableAddition),
      taxableAddition: sum((r) => r.inputs.taxableAddition),
      netSalary: sum((r) => r.calc.netSalary),
      paid: sum((r) => r.inputs.paid),
      balance: sum((r) => r.calc.balance),
    };
  }, [sheet, rows, filtered]);

  const applyWorkingDays = async () => {
    const days = Number(workingDays);
    if (!/^\d+$/.test(workingDays) || days < 1 || (sheet && days > sheet.daysInMonth)) {
      toast.error(`Working days must be 1–${sheet?.daysInMonth ?? 31}`);
      return;
    }
    setApplyingDays(true);
    try {
      await setPayrollWorkingDays(month, days);
      toast.success(`${days} working days applied to everyone for ${sheet?.monthLabel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update working days');
    } finally {
      setApplyingDays(false);
    }
  };

  const outdatedCount = (sheet?.rows ?? []).filter((r) => r.slipOutdated).length;
  const notGenerated = (sheet?.rows ?? []).filter((r) => !r.slip).length;

  return (
    <>
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
          label="Payroll month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: currentSalaryMonth() } }}
          sx={{ width: { xs: 1, md: 190 } }}
        />
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: { xs: 1, md: 'auto' } }}
        >
          <TextField
            label="Working days"
            value={workingDays}
            disabled={!canEditAll}
            onChange={(event) => setWorkingDays(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applyWorkingDays()}
            helperText={sheet ? `Out of ${sheet.daysInMonth}` : ' '}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            sx={{ width: { xs: 1, md: 130 } }}
          />
          {canEditAll && sheet && workingDays !== String(sheet.workingDays) && (
            <Button
              variant="outlined"
              loading={applyingDays}
              onClick={applyWorkingDays}
              sx={{ mb: 2.75 }}
            >
              Apply to all
            </Button>
          )}
        </Stack>
        <TextField
          select
          label="Department"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          sx={{ width: { xs: 1, md: 200 } }}
        >
          <MenuItem value="">All</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search by name, staff ID or CNIC"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: { xs: 1, md: 280 } }}
        />
        <Button
          variant="outlined"
          loading={exporting}
          disabled={!sheet || !sheet.rows.length}
          startIcon={<Iconify icon="solar:download-bold" />}
          onClick={onExport}
          sx={{ ml: { md: 'auto' } }}
        >
          Export Excel
        </Button>
      </Box>

      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {canEditAll
            ? 'Staff ID, name, ID card number, bank details and gross salary come from each employee’s account. Fill in unpaid holidays, security and additions, then generate each slip from its row. Tax is entered by the accountant only.'
            : 'You fill in Tax (only you can) and Paid. HR generates the salary slips from this sheet.'}
        </Typography>
        {!!outdatedCount && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {outdatedCount === 1
              ? '1 salary slip no longer matches its row'
              : `${outdatedCount} salary slips no longer match their rows`}{' '}
            — {canEditAll ? 'regenerate them to bring them up to date.' : 'ask HR to regenerate.'}
          </Alert>
        )}
      </Box>

      {sheetError && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {sheetError.message}
        </Alert>
      )}

      <Scrollbar>
        <Table size="small" sx={{ minWidth: 2050, '& td, & th': { whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2}>Staff ID</TableCell>
              <TableCell rowSpan={2}>Employee name</TableCell>
              <TableCell rowSpan={2}>ID card number</TableCell>
              <TableCell rowSpan={2}>Bank details</TableCell>
              <TableCell rowSpan={2} align="right">
                Gross salary
              </TableCell>
              <TableCell rowSpan={2} align="right">
                Taxable salary
              </TableCell>
              <TableCell colSpan={4} align="center" sx={{ borderBottom: 0 }}>
                Deductions
              </TableCell>
              <TableCell colSpan={2} align="center" sx={{ borderBottom: 0 }}>
                Additions
              </TableCell>
              <TableCell rowSpan={2} align="right">
                Net salary
              </TableCell>
              <TableCell rowSpan={2} align="right">
                Paid
              </TableCell>
              <TableCell rowSpan={2} align="right">
                Balance
              </TableCell>
              <TableCell rowSpan={2} align="right">
                Salary slip
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="right">Unpaid holidays</TableCell>
              <TableCell align="right">Security deduction</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Loan deduction</TableCell>
              <TableCell align="right">Non-taxable</TableCell>
              <TableCell align="right">Taxable</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sheetLoading && (
              <TableRow>
                <TableCell colSpan={16} sx={{ py: 6, textAlign: 'center' }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!sheetLoading && sheet && !rows.length && (
              <TableRow>
                <TableCell
                  colSpan={16}
                  sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                >
                  {filtered
                    ? 'No one matches the filters.'
                    : 'No employees on the payroll for this month.'}
                </TableCell>
              </TableRow>
            )}
            {sheet &&
              rows.map((row) => (
                <PayrollSheetRow
                  key={`${sheet.month}:${row.employeeId}`}
                  row={row}
                  month={sheet.month}
                  daysInMonth={sheet.daysInMonth}
                  canEditAll={canEditAll}
                  canEditTax={canEditTax}
                  onView={(slip) => setViewing(slip)}
                />
              ))}
            {sheet && totals && !!rows.length && (
              <TableRow sx={{ '& td': { fontWeight: 700, bgcolor: 'background.neutral' } }}>
                <TableCell colSpan={4}>
                  Total{filtered ? ` (${rows.length} shown)` : ` (${rows.length})`}
                </TableCell>
                <TableCell align="right">{money(totals.grossSalary)}</TableCell>
                <TableCell align="right">{money(totals.taxableSalary)}</TableCell>
                <TableCell align="right">{money(totals.unpaidDeduction)}</TableCell>
                <TableCell align="right">{money(totals.securityDeduction)}</TableCell>
                <TableCell align="right">{money(totals.tax)}</TableCell>
                <TableCell align="right">{money(totals.loanDeduction)}</TableCell>
                <TableCell align="right">{money(totals.nonTaxableAddition)}</TableCell>
                <TableCell align="right">{money(totals.taxableAddition)}</TableCell>
                <TableCell align="right">{money(totals.netSalary)}</TableCell>
                <TableCell align="right">{money(totals.paid)}</TableCell>
                <TableCell align="right">{money(totals.balance)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                  {notGenerated ? `${notGenerated} not generated` : 'All generated'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>
      <Typography
        variant="caption"
        component="p"
        sx={{ px: 2.5, py: 1.5, color: 'text.secondary' }}
      >
        Amounts in Rs. Unpaid holidays = Gross ÷ Working days × days · Taxable = Gross − Unpaid −
        Security + Taxable addition · Net = Gross − Unpaid − Security − Tax − Loan + Additions ·
        Balance = Net − Paid.
      </Typography>

      {viewing !== null && typeof viewing !== 'number' && (
        <SalarySlipPreviewDialog slip={viewing} canSend={canEditAll} onClose={closeViewing} />
      )}
      {typeof viewing === 'number' && (
        <SlipByIdPreview id={viewing} canSend={canEditAll} onClose={closeViewing} />
      )}
    </>
  );
}

// ----------------------------------------------------------------------

type RowProps = {
  row: PayrollRow;
  month: string;
  daysInMonth: number;
  canEditAll: boolean;
  /** Only the accountant enters Tax. */
  canEditTax: boolean;
  /** A freshly generated slip, or the id of an existing one. */
  onView: (slip: SalarySlipDto | number) => void;
};

function PayrollSheetRow({ row, month, daysInMonth, canEditAll, canEditTax, onView }: RowProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(row.inputs));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const pendingSave = useRef<Promise<unknown> | null>(null);

  // Take the server's figures whenever the row comes back changed.
  const serverKey = JSON.stringify(row.inputs);
  useEffect(() => {
    setDraft(draftFrom(row.inputs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const loanDeduction =
    draft.loanOverride.trim() === '' ? (row.loan?.amount ?? 0) : num(draft.loanOverride);
  const calc = calculatePayroll({
    grossSalary: num(draft.grossSalary),
    workingDays: num(draft.workingDays),
    unpaidDays: num(draft.unpaidDays),
    securityMode: draft.securityMode,
    securityAmount: num(draft.securityAmount),
    tax: num(draft.tax),
    loanDeduction,
    nonTaxableAddition: num(draft.nonTaxableAddition),
    taxableAddition: num(draft.taxableAddition),
    paid: num(draft.paid),
  });

  const validate = (key: keyof Draft, value: string): string | null => {
    const v = value.trim();
    if (key === 'workingDays') {
      return /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= daysInMonth
        ? null
        : `Working days must be 1–${daysInMonth}`;
    }
    if (v === '') return key === 'grossSalary' ? 'Enter the gross salary' : null;
    if (!AMOUNT.test(v)) return 'Enter a number with up to 2 decimals';
    if (key === 'unpaidDays' && Number(v) > num(draft.workingDays)) {
      return 'Unpaid holidays cannot be more than the working days';
    }
    return null;
  };

  const save = (patch: PayrollEntryPatch) => {
    setSaving(true);
    const promise = updatePayrollEntry(row.employeeId, month, patch)
      .catch((error) => {
        toast.error(
          `${row.employeeName}: ${error instanceof Error ? error.message : 'Could not save'}`
        );
        setDraft(draftFrom(row.inputs));
      })
      .finally(() => {
        setSaving(false);
        if (pendingSave.current === promise) pendingSave.current = null;
      });
    pendingSave.current = promise;
    return promise;
  };

  const commit = (key: keyof Draft) => {
    const value = draft[key];
    const original = draftFrom(row.inputs)[key];
    if (value === original) return;
    const error = validate(key, value);
    if (error) {
      toast.error(`${row.employeeName}: ${error}`);
      setDraft((prev) => ({ ...prev, [key]: original }));
      return;
    }
    if (key === 'securityMode') {
      save({ securityMode: value as SecurityDeductionMode });
    } else if (key === 'loanOverride') {
      save({ loanOverride: value.trim() === '' ? null : Number(value) });
    } else {
      save({ [key]: num(value) } as PayrollEntryPatch);
    }
  };

  const editable = (key: keyof Draft) =>
    key === 'tax' ? canEditTax : canEditAll || key === 'paid';

  const cell = (
    key: keyof Draft,
    opts: { width?: number; placeholder?: string; days?: boolean } = {}
  ) =>
    editable(key) ? (
      <TextField
        size="small"
        value={draft[key]}
        placeholder={opts.placeholder ?? (opts.days ? '0' : '0.00')}
        onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
        onBlur={() => commit(key)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
          if (event.key === 'Escape') setDraft(draftFrom(row.inputs));
        }}
        slotProps={{
          htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } },
          ...(opts.days && {
            input: { endAdornment: <InputAdornment position="end">d</InputAdornment> },
          }),
        }}
        sx={{ width: opts.width ?? 120 }}
      />
    ) : (
      <span>{opts.days ? `${draft[key] || 0} d` : money(num(draft[key]))}</span>
    );

  const hint = (value: number, negative = true) =>
    value ? (
      <Typography
        variant="caption"
        component="div"
        sx={{ color: negative ? 'error.main' : 'text.secondary' }}
      >
        {negative ? '− ' : ''}
        {money(value)}
      </Typography>
    ) : null;

  const generate = async (regenerate: boolean) => {
    setGenerating(true);
    try {
      // A cell edited just before clicking saves on blur — let that finish first.
      if (pendingSave.current) await pendingSave.current;
      const slip = await generateSlipFromPayroll(row.employeeId, month, regenerate);
      toast.success(
        slip.revision > 1
          ? `Revised salary slip generated for ${slip.employeeName}`
          : `Salary slip generated for ${slip.employeeName}`
      );
      onView(slip);
    } catch (error) {
      toast.error(
        `${row.employeeName}: ${error instanceof Error ? error.message : 'Could not generate'}`
      );
    } finally {
      setGenerating(false);
    }
  };

  const negativeNet = calc.netSalary < 0;

  return (
    <TableRow hover sx={{ verticalAlign: 'top', '& td': { py: 1 } }}>
      <TableCell>{row.staffId ?? '—'}</TableCell>
      <TableCell>
        <Typography variant="subtitle2">{row.employeeName}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {[row.designation, row.departmentName].filter(Boolean).join(' · ') || '—'}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
          {row.employeeStatus === 'INACTIVE' && (
            <Label color="warning" variant="soft">
              Removed
            </Label>
          )}
          {saving && <CircularProgress size={14} />}
        </Stack>
      </TableCell>
      <TableCell>
        {row.nationalId ?? (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            Not on file
          </Box>
        )}
      </TableCell>
      <TableCell>
        {row.bankName || row.bankAccountNumberMasked ? (
          <>
            <Typography variant="body2">{row.bankName ?? '—'}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {row.bankAccountNumberMasked ?? ''}
            </Typography>
          </>
        ) : (
          <Box component="span" sx={{ color: 'text.disabled' }}>
            Not on file
          </Box>
        )}
      </TableCell>
      <TableCell align="right">
        {cell('grossSalary', { width: 130 })}
        {canEditAll && (
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {cell('workingDays', { width: 90, days: true })}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">{money(calc.taxableSalary)}</TableCell>
      <TableCell align="right">
        {cell('unpaidDays', { width: 90, days: true })}
        {hint(calc.unpaidDeduction)}
      </TableCell>
      <TableCell align="right">
        {canEditAll ? (
          <Stack spacing={0.75} alignItems="flex-end">
            <TextField
              select
              size="small"
              value={draft.securityMode}
              onChange={(event) => {
                const securityMode = event.target.value as SecurityDeductionMode;
                setDraft((prev) => ({ ...prev, securityMode }));
                if (securityMode !== 'MANUAL') save({ securityMode });
                else save({ securityMode, securityAmount: num(draft.securityAmount) });
              }}
              sx={{ width: 140 }}
            >
              {SECURITY_DEDUCTION_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {draft.securityMode === 'MANUAL'
              ? cell('securityAmount')
              : hint(calc.securityDeduction)}
          </Stack>
        ) : (
          money(calc.securityDeduction)
        )}
      </TableCell>
      <TableCell align="right">{cell('tax')}</TableCell>
      <TableCell align="right">
        {cell('loanOverride', { placeholder: row.loan ? money(row.loan.amount) : '0.00' })}
        {row.loan && (
          <Tooltip
            title={`${fSalary(row.loan.remainingBefore)} still owed of ${fSalary(row.loan.principal)}. Leave empty to take the scheduled instalment.`}
          >
            <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
              {draft.loanOverride.trim() === '' ? 'Instalment' : 'Override of'}{' '}
              {row.loan.instalmentNo}/{row.loan.instalments}
            </Typography>
          </Tooltip>
        )}
      </TableCell>
      <TableCell align="right">{cell('nonTaxableAddition')}</TableCell>
      <TableCell align="right">{cell('taxableAddition')}</TableCell>
      <TableCell
        align="right"
        sx={{ fontWeight: 700, color: negativeNet ? 'error.main' : 'text.primary' }}
      >
        {money(calc.netSalary)}
      </TableCell>
      <TableCell align="right">{cell('paid', { width: 130 })}</TableCell>
      <TableCell align="right" sx={{ color: calc.balance < 0 ? 'error.main' : 'text.primary' }}>
        {money(calc.balance)}
      </TableCell>
      <TableCell align="right">
        {row.slip ? (
          <Stack spacing={0.5} alignItems="flex-end">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption">{row.slip.reference}</Typography>
              <Tooltip title="View salary slip">
                <IconButton size="small" onClick={() => onView(row.slip!.id)}>
                  <Iconify icon="solar:eye-bold" width={18} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Label variant="soft" color={EMAIL_STATUS_COLOR[row.slip.emailStatus]}>
              {EMAIL_STATUS_LABEL[row.slip.emailStatus]}
            </Label>
            {row.slipOutdated && canEditAll && (
              <Button
                size="small"
                color="warning"
                variant="soft"
                loading={generating}
                disabled={saving}
                startIcon={<Iconify icon="solar:restart-bold" />}
                onClick={() => setConfirmRegenerate(true)}
              >
                Regenerate
              </Button>
            )}
            {row.slipOutdated && !canEditAll && (
              <Label color="warning" variant="soft">
                Out of date
              </Label>
            )}
          </Stack>
        ) : canEditAll ? (
          <Button
            size="small"
            variant="contained"
            loading={generating}
            disabled={saving || negativeNet}
            startIcon={<Iconify icon="solar:file-text-bold" />}
            onClick={() => generate(false)}
          >
            Generate
          </Button>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Not generated
          </Typography>
        )}

        <ConfirmDialog
          open={confirmRegenerate}
          onClose={() => setConfirmRegenerate(false)}
          title={`Regenerate ${row.employeeName}'s salary slip?`}
          content={`The current slip (${row.slip?.reference}, net ${fSalary(row.slip?.netSalary)}) is replaced by a revised one with net ${fSalary(calc.netSalary)}. The old one is kept in history.`}
          action={
            <Button
              variant="contained"
              onClick={() => {
                setConfirmRegenerate(false);
                generate(true);
              }}
            >
              Regenerate
            </Button>
          }
        />
      </TableCell>
    </TableRow>
  );
}

// ----------------------------------------------------------------------

/** Opens an existing slip from the sheet (the row only carries its id and summary). */
function SlipByIdPreview({
  id,
  canSend,
  onClose,
}: {
  id: number;
  canSend: boolean;
  onClose: () => void;
}) {
  const [slip, setSlip] = useState<SalarySlipDto | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchSalarySlip(id)
      .then((data) => !cancelled && setSlip(data))
      .catch((error: Error) => {
        toast.error(error.message);
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [id, onClose]);
  return slip ? <SalarySlipPreviewDialog slip={slip} canSend={canSend} onClose={onClose} /> : null;
}
