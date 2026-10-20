import type { LetterDelivery } from 'src/types/letter';

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
// the letter's timeline once it's sent (same "event.comment" pattern as Request changes). For a
// candidate letter (no account yet) the backend emails the PDF to the candidate instead. The
// response's `delivery` says who was emailed, shown in the toast.

export type SendToEmployeeSchemaType = zod.infer<typeof SendToEmployeeSchema>;

export const SendToEmployeeSchema = zod.object({
  message: zod.string().optional(),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (message: string | undefined) => Promise<LetterDelivery | undefined | void>;
  /** Candidate letter: the PDF is emailed to the candidate's address. */
  isCandidate?: boolean;
};

function deliveryToast(delivery: LetterDelivery | undefined | void, isCandidate: boolean) {
  if (!delivery) {
    toast.success(isCandidate ? 'Sent to candidate!' : 'Sent to employee!');
    return;
  }
  if (delivery.warning) {
    toast.warning(`Sent, but: ${delivery.warning}`);
    return;
  }
  toast.success(
    delivery.emailedTo
      ? `Sent — the signed PDF was emailed to ${delivery.emailedTo}.`
      : 'Sent to employee!'
  );
}

export function LetterSendToEmployeeDialog({ open, onClose, onConfirm, isCandidate = false }: Props) {
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
      const delivery = await onConfirm(data.message || undefined);
      deliveryToast(delivery, isCandidate);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Send failed!');
    }
  });

  const actionLabel = isCandidate ? 'Send to candidate by email' : 'Send to employee';

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>{actionLabel}</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ mb: 2 }}>
            {isCandidate
              ? "The CEO-signed PDF is emailed to the candidate. They'll be able to sign it in the portal once their employee account is created. Add an optional note — it's included in the email."
              : 'The employee will be able to view, download, and e-sign this letter. They also get it by email with the PDF attached. Add an optional note for them — it shows up alongside the letter.'}
          </DialogContentText>
          <Field.Text name="message" label="Message (optional)" multiline rows={3} />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {actionLabel}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
