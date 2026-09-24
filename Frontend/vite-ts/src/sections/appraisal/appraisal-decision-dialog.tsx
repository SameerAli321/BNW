import type { ButtonProps } from '@mui/material/Button';

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
// Shared "remarks + message, then decide" dialog for both the manager's
// POST /appraisal-requests/:id/manager-decision and the CEO's
// POST /appraisal-requests/:id/ceo-decision (docs/API_CONTRACT_SPRINT4.md) — same
// "add remarks + message, then accept/reject/send-back" shape the contract explicitly asks to
// reuse from the Letter Engine's sign/request-changes dialogs
// (src/sections/letter/letter-sign-dialog.tsx / letter-request-changes-dialog.tsx), generalized
// here to a configurable set of decision buttons since the manager only has two options
// (Accept/Reject) and the CEO has three (Accept/Reject/Send back to manager).

export type DecisionSchemaType = zod.infer<typeof DecisionSchema>;

export const DecisionSchema = zod.object({
  remarks: zod.string().min(1, { message: 'Remarks are required.' }),
  message: zod.string().min(1, { message: 'A message is required.' }),
});

export type DecisionButtonSpec<TDecision extends string> = {
  decision: TDecision;
  label: string;
  color?: ButtonProps['color'];
  variant?: ButtonProps['variant'];
};

type Props<TDecision extends string> = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  buttons: DecisionButtonSpec<TDecision>[];
  onConfirm: (data: { remarks: string; message: string }, decision: TDecision) => Promise<void>;
};

export function AppraisalDecisionDialog<TDecision extends string>({
  open,
  onClose,
  title,
  description,
  buttons,
  onConfirm,
}: Props<TDecision>) {
  const methods = useForm<DecisionSchemaType>({
    resolver: zodResolver(DecisionSchema),
    defaultValues: { remarks: '', message: '' },
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

  const makeSubmitHandler = (decision: TDecision) =>
    handleSubmit(async (data) => {
      try {
        await onConfirm(data, decision);
        toast.success('Decision recorded!');
        handleClose();
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Submitting the decision failed!');
      }
    });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <Form methods={methods}>
        <DialogTitle>{title}</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {description && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          )}

          <Field.Text name="remarks" label="Remarks" multiline rows={3} />
          <Field.Text name="message" label="Message to the employee" multiline rows={3} />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          {buttons.map((btn) => (
            <Button
              key={btn.decision}
              type="button"
              variant={btn.variant ?? 'contained'}
              color={btn.color ?? 'primary'}
              loading={isSubmitting}
              onClick={makeSubmitHandler(btn.decision)}
            >
              {btn.label}
            </Button>
          ))}
        </DialogActions>
      </Form>
    </Dialog>
  );
}
