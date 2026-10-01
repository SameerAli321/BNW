import type { WorkOrderType } from 'src/actions/work-orders';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { fPkr, createWorkOrder, useGetWorkOrderSettings } from 'src/actions/work-orders';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * New work order — a reimbursement claim (amount, date, receipt) or an equipment request
 * (item, quantity, needed by, optional quotation). Shows who it will go to, including the CEO
 * step when the amount is over the limit.
 */
export function WorkOrderCreateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { settings } = useGetWorkOrderSettings();
  const fileInput = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<WorkOrderType>(
    searchParams.get('type') === 'EQUIPMENT' ? 'EQUIPMENT' : 'REIMBURSEMENT'
  );
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [neededBy, setNeededBy] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isReimbursement = type === 'REIMBURSEMENT';
  const categories = (isReimbursement ? settings?.reimbursementCategories : settings?.equipmentCategories) ?? [];
  const amountNumber = Number(amount);
  const needsCeo =
    !!settings && amount !== '' && amountNumber > settings.ceoApprovalLimit && user?.role !== 'CEO';

  const route = [
    ...(user?.managerId ? ['Your line manager'] : []),
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
    if (title.trim().length < 3) return toast.error(isReimbursement ? 'Say what the expense was for' : 'Say what you need');
    if (!category) return toast.error('Choose a category');
    if (!description.trim()) return toast.error('Add some details');
    if (isReimbursement) {
      if (!(amountNumber > 0)) return toast.error('Enter the amount you spent');
      if (!expenseDate) return toast.error('Enter the date you spent the money');
    }
    setSubmitting(true);
    try {
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
        heading={isReimbursement ? 'Claim a reimbursement' : 'Request equipment'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Work orders', href: paths.dashboard.workOrders.root },
          { name: 'New' },
        ]}
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={type}
          onChange={(_event, value: WorkOrderType | null) => {
            if (!value) return;
            setType(value);
            setCategory('');
          }}
        >
          <ToggleButton value="REIMBURSEMENT" sx={{ gap: 1, py: 1.5 }}>
            <Iconify icon="solar:wad-of-money-bold" /> Reimbursement — I paid for something
          </ToggleButton>
          <ToggleButton value="EQUIPMENT" sx={{ gap: 1, py: 1.5 }}>
            <Iconify icon="solar:monitor-bold" /> Equipment — I need something
          </ToggleButton>
        </ToggleButtonGroup>

        <HrFormSection title={isReimbursement ? 'Expense details' : 'What you need'}>
          <TextField
            label={isReimbursement ? 'What was it for?' : 'Item'}
            placeholder={isReimbursement ? 'e.g. Taxi to the client office in Gulberg' : 'e.g. 24-inch monitor'}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
          <TextField select label="Category" value={category} onChange={(event) => setCategory(event.target.value)} fullWidth>
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
            label={isReimbursement ? 'Details (client, purpose, who attended…)' : 'Why do you need it?'}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
            fullWidth
          />

          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
            <input ref={fileInput} type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp" onChange={onPickFile} />
            <Button variant="outlined" color="inherit" startIcon={<Iconify icon="eva:attach-2-fill" />} onClick={() => fileInput.current?.click()}>
              {receipt ? 'Change file' : isReimbursement ? 'Attach receipt' : 'Attach quotation (optional)'}
            </Button>
            {receipt ? (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2">{receipt.name}</Typography>
                <Button size="small" color="error" onClick={() => setReceipt(null)}>
                  Remove
                </Button>
              </Stack>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                PDF or photo, up to 10 MB{isReimbursement ? ' — a receipt makes approval faster' : ''}
              </Typography>
            )}
          </Stack>
        </HrFormSection>

        <Alert severity={needsCeo ? 'warning' : 'info'} icon={<Iconify icon="solar:forward-bold" />}>
          <strong>Goes to:</strong> {route.join('  →  ')}
          {needsCeo && settings ? ` — the CEO approves anything over ${fPkr(settings.ceoApprovalLimit)}.` : ''}
        </Alert>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button component={RouterLink} href={paths.dashboard.workOrders.root} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button variant="contained" loading={submitting} onClick={onSubmit}>
            Submit
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
