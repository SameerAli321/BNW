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
// POST /appraisal-requests — per docs/API_CONTRACT_SPRINT4.md the contract's field is just
// `selfEvaluation: text`, so a single multiline field is enough (no multi-question form).

export type RequestAppraisalSchemaType = zod.infer<typeof RequestAppraisalSchema>;

export const RequestAppraisalSchema = zod.object({
  selfEvaluation: zod.string().min(1, { message: 'A self-evaluation is required.' }),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (selfEvaluation: string) => Promise<void>;
};

export function AppraisalRequestDialog({ open, onClose, onConfirm }: Props) {
  const methods = useForm<RequestAppraisalSchemaType>({
    resolver: zodResolver(RequestAppraisalSchema),
    defaultValues: { selfEvaluation: '' },
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
      await onConfirm(data.selfEvaluation);
      toast.success('Appraisal requested!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Request failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Request an appraisal</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            This goes to your manager first, then the CEO once your manager accepts it.
          </Typography>

          <Field.Text
            name="selfEvaluation"
            label="Self-evaluation"
            placeholder="Summarize your work, achievements and areas for growth this quarter…"
            multiline
            rows={6}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Submit
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
