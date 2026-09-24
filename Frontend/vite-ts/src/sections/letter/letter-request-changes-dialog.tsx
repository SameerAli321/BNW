import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------
// CEO's `POST /letters/:id/request-changes` — `{ comment }` is required per the contract.

export type RequestChangesSchemaType = zod.infer<typeof RequestChangesSchema>;

export const RequestChangesSchema = zod.object({
  comment: zod.string().min(1, { message: 'A comment is required.' }),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => Promise<void>;
};

export function LetterRequestChangesDialog({ open, onClose, onConfirm }: Props) {
  const methods = useForm<RequestChangesSchemaType>({
    resolver: zodResolver(RequestChangesSchema),
    defaultValues: { comment: '' },
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
      await onConfirm(data.comment);
      toast.success('Changes requested!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Request failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Request changes</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Field.Text
            name="comment"
            label="What needs to change?"
            multiline
            rows={3}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="warning" loading={isSubmitting}>
            Send back to HR
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
