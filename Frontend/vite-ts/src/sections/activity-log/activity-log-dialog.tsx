import type { ActivityLogDto, CreateActivityLogDto } from 'src/types/activity-log';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { ACTIVITY_CATEGORY_OPTIONS } from 'src/types/activity-log';

// ----------------------------------------------------------------------
// POST /activity-logs (new) or PATCH /activity-logs/:id (edit) — one dialog for both, since the
// fields are identical. Per docs/API_CONTRACT_ACTIVITY_LOG.md: no future dates, 0.25–24 hours.

export type ActivityLogSchemaType = zod.infer<typeof ActivityLogSchema>;

export const ActivityLogSchema = zod.object({
  activityDate: zod.string().min(1, { message: 'Date is required.' }),
  category: zod.string().min(1, { message: 'Category is required.' }),
  // The number field hands back a string while typing but a number (or '') after blur, so
  // accept either and validate the numeric value.
  hours: zod.union([zod.string(), zod.number()]).refine(
    (value) => {
      const hours = Number(value);
      return !Number.isNaN(hours) && hours >= 0.25 && hours <= 24;
    },
    { message: 'Enter between 0.25 and 24 hours.' }
  ),
  description: zod
    .string()
    .min(1, { message: 'Describe what you worked on.' })
    .max(2000, { message: 'Keep it under 2000 characters.' }),
});

type Props = {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing entry; absent when logging a new one. */
  current?: ActivityLogDto | null;
  onConfirm: (payload: CreateActivityLogDto) => Promise<void>;
};

function defaultValues(current?: ActivityLogDto | null): ActivityLogSchemaType {
  return {
    activityDate: current?.activityDate ?? dayjs().format('YYYY-MM-DD'),
    category: current?.category ?? 'CLIENT_WORK',
    hours: current ? String(current.hours) : '',
    description: current?.description ?? '',
  };
}

export function ActivityLogDialog({ open, onClose, current, onConfirm }: Props) {
  const methods = useForm<ActivityLogSchemaType>({
    resolver: zodResolver(ActivityLogSchema),
    defaultValues: defaultValues(current),
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // Re-seed the form each time it opens, so "edit" shows that row and "new" starts blank.
  useEffect(() => {
    if (open) {
      reset(defaultValues(current));
    }
  }, [open, current, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await onConfirm({
        activityDate: dayjs(data.activityDate).format('YYYY-MM-DD'),
        category: data.category as CreateActivityLogDto['category'],
        hours: Number(data.hours),
        description: data.description.trim(),
      });
      toast.success(current ? 'Activity updated!' : 'Activity logged!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not save activity!');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>{current ? 'Edit activity' : 'Log activity'}</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Box
            sx={{
              pt: 1,
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 120px' },
            }}
          >
            <Field.DatePicker name="activityDate" label="Date" maxDate={dayjs()} disableFuture />

            <Field.Select name="category" label="Category">
              {ACTIVITY_CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Field.Select>

            <Field.Text
              name="hours"
              label="Hours"
              type="number"
              slotProps={{ htmlInput: { min: 0.25, max: 24, step: 0.25 } }}
            />
          </Box>

          <Field.Text
            name="description"
            label="What did you work on?"
            placeholder="e.g. Prepared year-end accounts for client X, reviewed VAT return…"
            multiline
            rows={5}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {current ? 'Save' : 'Log activity'}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
