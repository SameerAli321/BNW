import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------
// Sprint 3 — simple in-app signature per docs/API_CONTRACT_SPRINT3.md scope cut #3: a typed-name
// field, no drawn-signature canvas. Reused for both the CEO's `ceo-sign` action and the subject's
// own `employee-sign` action — the caller supplies the label/copy and the actual API call.

export type SignSchemaType = zod.infer<typeof SignSchema>;

export const SignSchema = zod.object({
  signatureText: zod.string().min(1, { message: 'Type your full name to sign.' }),
});

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: (signatureText: string) => Promise<void>;
};

export function LetterSignDialog({ open, onClose, title, description, onConfirm }: Props) {
  const methods = useForm<SignSchemaType>({
    resolver: zodResolver(SignSchema),
    defaultValues: { signatureText: '' },
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
      await onConfirm(data.signatureText);
      toast.success('Signed!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Signing failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>{title}</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>

          <Field.Text
            name="signatureText"
            label="Type your full name to sign"
            placeholder="e.g. Jane Doe"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Confirm signature
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
