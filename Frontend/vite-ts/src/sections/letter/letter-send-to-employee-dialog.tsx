import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------
// HR's `POST /letters/:id/send-to-employee` — `{ message }` is optional, shown to the employee on
// the letter's timeline once it's sent (same "event.comment" pattern as Request changes).

export type SendToEmployeeSchemaType = zod.infer<typeof SendToEmployeeSchema>;

export const SendToEmployeeSchema = zod.object({
  message: zod.string().optional(),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (message: string | undefined) => Promise<void>;
};

export function LetterSendToEmployeeDialog({ open, onClose, onConfirm }: Props) {
  const methods = useForm<SendToEmployeeSchemaType>({
    resolver: zodResolver(SendToEmployeeSchema),
    defaultValues: { message: '' },
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
      await onConfirm(data.message || undefined);
      toast.success('Sent to employee!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Send failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Send to employee</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ mb: 2 }}>
            The employee will be able to view, download, and e-sign this letter. Add an optional
            note for them — it shows up alongside the letter.
          </DialogContentText>
          <Field.Text
            name="message"
            label="Message (optional)"
            multiline
            rows={3}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Send to employee
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
