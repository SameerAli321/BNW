import type { WorkOrderDto, WorkOrderType } from 'src/actions/work-orders';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fPkr,
  createWorkOrder,
  updateWorkOrder,
  useGetWorkOrderSettings,
} from 'src/actions/work-orders';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  // Editing an existing work order (until the first decision) instead of creating one.
  current?: WorkOrderDto;
};

/**
 * New work order — a reimbursement claim (amount, date, receipt) or an equipment request
 * (item, quantity, needed by, optional quotation). Shows who it will go to, including the CEO
 * step when the amount is over the limit. Also the edit form (the type is fixed by then).
 */
export function WorkOrderCreateView({ current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { settings } = useGetWorkOrderSettings();
  const fileInput = useRef<HTMLInputElement>(null);

  // Reimbursement claims and equipment requests are separate forms on Requests & Forms (?type=),
  // so there's no switching between them here.
  const type: WorkOrderType =
    current?.type ?? (searchParams.get('type') === 'EQUIPMENT' ? 'EQUIPMENT' : 'REIMBURSEMENT');
  const [title, setTitle] = useState(current?.title ?? '');
  const [category, setCategory] = useState(current?.category ?? '');
  const [description, setDescription] = useState(current?.description ?? '');
  const [amount, setAmount] = useState(current?.amount != null ? String(current.amount) : '');
  const [expenseDate, setExpenseDate] = useState(current?.expenseDate ?? '');
  const [quantity, setQuantity] = useState(String(current?.quantity ?? 1));
  const [neededBy, setNeededBy] = useState(current?.neededBy ?? '');
  const [receipt, setReceipt] = useState<File | null>(null);
  // Editing: the file already attached, until it's replaced or removed.
  const [keptReceiptName, setKeptReceiptName] = useState(
    current?.hasReceipt ? (current.receiptOriginalName ?? 'Attached file') : null
  );
  const [submitting, setSubmitting] = useState(false);

  const isReimbursement = type === 'REIMBURSEMENT';
  const categories =
    (isReimbursement ? settings?.reimbursementCategories : settings?.equipmentCategories) ?? [];
  const amountNumber = Number(amount);
  const needsCeo =
    !!settings && amount !== '' && amountNumber > settings.ceoApprovalLimit && user?.role !== 'CEO';
  const hasManager = current ? !!current.managerId : !!user?.managerId;

  const route = [
    ...(hasManager ? ['Your line manager'] : []),
    ...(needsCeo ? ['CEO'] : []),
    isReimbursement ? 'Payroll (pays you)' : 'HR (issues the item)',
  ];

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error('The file must be 10 MB or smaller');
      return;
    }
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Attach a PDF or an image (JPG, PNG, WEBP)');
      return;
    }
    setReceipt(file);
  };

  const onSubmit = async () => {
    if (title.trim().length < 3)
      return toast.error(isReimbursement ? 'Say what the expense was for' : 'Say what you need');
    if (!category) return toast.error('Choose a category');
    if (!description.trim()) return toast.error('Add some details');
    if (isReimbursement) {
      if (!(amountNumber > 0)) return toast.error('Enter the amount you spent');
      if (!expenseDate) return toast.error('Enter the date you spent the money');
    }
    setSubmitting(true);
    try {
      if (current) {
        // '' clears an optional field; the receipt is kept unless replaced or removed.
        await updateWorkOrder(
          current.id,
          {
            title: title.trim(),
            category,
            description: description.trim(),
            amount: amount === '' ? '' : amountNumber,
            ...(isReimbursement ? { expenseDate } : { quantity: Number(quantity) || 1, neededBy }),
          },
          receipt,
          current.hasReceipt && !receipt && !keptReceiptName
        );
        toast.success('Work order updated — the approver has been told');
        router.push(paths.dashboard.workOrders.details(current.id));
        return undefined;
      }
      const created = await createWorkOrder(
        {
          type,
          title: title.trim(),
          category,
          description: description.trim(),
          amount: amount === '' ? undefined : amountNumber,
          ...(isReimbursement
            ? { expenseDate }
            : { quantity: Number(quantity) || 1, neededBy: neededBy || undefined }),
        },
        receipt
      );
      toast.success(
        created.status === 'PENDING_MANAGER'
          ? 'Sent to your line manager for approval!'
          : created.status === 'PENDING_CEO'
            ? 'Sent to the CEO for approval!'
            : `Sent to ${isReimbursement ? 'Payroll' : 'HR'}!`
      );
      router.push(paths.dashboard.workOrders.details(created.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Submit failed!');
    } finally {
      setSubmitting(false);
    }
    return undefined;
  };

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading={
          current
            ? `Edit ${isReimbursement ? 'reimbursement claim' : 'equipment request'}`
            : isReimbursement
              ? 'Claim a reimbursement'
              : 'Request equipment'
        }
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Work orders', href: paths.dashboard.workOrders.root },
          ...(current
            ? [
                { name: `#${current.id}`, href: paths.dashboard.workOrders.details(current.id) },
                { name: 'Edit' },
              ]
            : [{ name: 'New' }]),
        ]}
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        {current && (current.managerSignedAt || current.ceoSignedAt) && (
          <Alert severity="warning">
            This has already been approved. Saving your changes sends it back for approval again.
          </Alert>
        )}

        <HrFormSection title={isReimbursement ? 'Expense details' : 'What you need'}>
          <TextField
            label={isReimbursement ? 'What was it for?' : 'Item'}
            placeholder={
              isReimbursement ? 'e.g. Taxi to the client office in Gulberg' : 'e.g. 24-inch monitor'
            }
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            fullWidth
          >
            {categories.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              type="number"
              label={isReimbursement ? 'Amount spent' : 'Estimated cost (optional)'}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
                htmlInput: { min: 0, step: 1 },
              }}
            />
            {isReimbursement ? (
              <TextField
                type="date"
                label="Date of expense"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
              />
            ) : (
              <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <TextField
                  type="number"
                  label="Quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  slotProps={{ htmlInput: { min: 1, max: 1000 } }}
                />
                <TextField
                  type="date"
                  label="Needed by"
                  value={neededBy}
                  onChange={(event) => setNeededBy(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today() } }}
                />
              </Box>
            )}
          </Box>

          <TextField
            label={
              isReimbursement ? 'Details (client, purpose, who attended…)' : 'Why do you need it?'
            }
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
            fullWidth
          />

          <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={onPickFile}
            />
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="eva:attach-2-fill" />}
              onClick={() => fileInput.current?.click()}
            >
              {receipt || keptReceiptName
                ? 'Change file'
                : isReimbursement
                  ? 'Attach receipt'
                  : 'Attach quotation (optional)'}
            </Button>
            {!receipt && keptReceiptName ? (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {keptReceiptName}
                </Typography>
                <Button size="small" color="error" onClick={() => setKeptReceiptName(null)}>
                  Remove
                </Button>
              </Stack>
            ) : receipt ? (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {receipt.name}
                </Typography>
                <Button size="small" color="error" onClick={() => setReceipt(null)}>
                  Remove
                </Button>
              </Stack>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                PDF or photo, up to 10 MB
                {isReimbursement ? ' — a receipt makes approval faster' : ''}
              </Typography>
            )}
          </Stack>
        </HrFormSection>

        <Alert
          severity={needsCeo ? 'warning' : 'info'}
          icon={<Iconify icon="solar:forward-bold" />}
        >
          <strong>Goes to:</strong> {route.join('  →  ')}
          {needsCeo && settings
            ? ` — the CEO approves anything over ${fPkr(settings.ceoApprovalLimit)}.`
            : ''}
        </Alert>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button
            component={RouterLink}
            href={
              current
                ? paths.dashboard.workOrders.details(current.id)
                : paths.dashboard.workOrders.root
            }
            variant="outlined"
            color="inherit"
          >
            Cancel
          </Button>
          <Button variant="contained" loading={submitting} onClick={onSubmit}>
            {current ? 'Save changes' : 'Submit'}
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
