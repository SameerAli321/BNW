import type { JoiningPackItemDto } from 'src/types/candidate';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { createJoiningPackItem, updateJoiningPackItem } from 'src/actions/joining-pack';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { JOINING_PACK_ITEM_KIND_OPTIONS } from 'src/types/candidate';

// ----------------------------------------------------------------------
// `POST /joining-pack-items` / `PATCH /joining-pack-items/:id` — HR, ADMIN only, same
// simple-CRUD shape as letter templates (no versioning) — see docs/API_CONTRACT_SPRINT5.md.

export type JoiningPackItemSchemaType = zod.infer<typeof JoiningPackItemSchema>;

export const JoiningPackItemSchema = zod.object({
  title: zod.string().min(1, { message: 'Title is required!' }),
  description: zod.string().optional(),
  kind: zod.string().min(1, { message: 'Kind is required!' }),
  isActive: zod.boolean(),
});

type Props = {
  open: boolean;
  onClose: () => void;
  currentItem?: JoiningPackItemDto;
};

export function JoiningPackItemDialog({ open, onClose, currentItem }: Props) {
  const isEdit = !!currentItem;

  const methods = useForm<JoiningPackItemSchemaType>({
    resolver: zodResolver(JoiningPackItemSchema),
    values: {
      title: currentItem?.title ?? '',
      description: currentItem?.description ?? '',
      kind: currentItem?.kind ?? '',
      isActive: currentItem?.isActive ?? true,
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        title: data.title,
        description: data.description || null,
        kind: data.kind as JoiningPackItemDto['kind'],
      };

      if (currentItem) {
        await updateJoiningPackItem(currentItem.id, { ...payload, isActive: data.isActive });
      } else {
        await createJoiningPackItem(payload);
      }

      toast.success(isEdit ? 'Item updated!' : 'Item added!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>{isEdit ? 'Edit item' : 'New joining pack item'}</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Field.Text name="title" label="Title" />

          <Field.Select name="kind" label="Kind">
            {JOINING_PACK_ITEM_KIND_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Field.Select>

          <Field.Text name="description" label="Description (optional)" multiline rows={3} />

          {isEdit && <Field.Switch name="isActive" label="Active" />}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
