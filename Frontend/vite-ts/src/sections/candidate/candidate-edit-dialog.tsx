import type { CandidateDto } from 'src/types/candidate';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { updateCandidate } from 'src/actions/candidates';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { CANDIDATE_STATUS_OPTIONS } from 'src/types/candidate';

// ----------------------------------------------------------------------
// `PATCH /candidates/:id` — HR, ADMIN. `{ name?, email?, phone?, status? }`, manual status moves
// (e.g. SHORTLISTED, REJECTED, or HR marking OFFERED after sending the letter) — see
// docs/API_CONTRACT_SPRINT5.md. Never rendered for an already-`HIRED` candidate (409 on the
// backend for that transition; `/convert` is the only way out of NEW/SHORTLISTED/OFFERED).

export type EditCandidateSchemaType = zod.infer<typeof EditCandidateSchema>;

export const EditCandidateSchema = zod.object({
  name: zod.string().min(1, { message: 'Name is required!' }),
  email: zod.string().min(1, { message: 'Email is required!' }).email({ message: 'Email must be valid!' }),
  phone: zod.string().optional(),
  status: zod.string().min(1, { message: 'Status is required!' }),
});

type Props = {
  open: boolean;
  onClose: () => void;
  candidate: CandidateDto;
};

export function CandidateEditDialog({ open, onClose, candidate }: Props) {
  const methods = useForm<EditCandidateSchemaType>({
    resolver: zodResolver(EditCandidateSchema),
    values: {
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone ?? '',
      status: candidate.status,
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
      await updateCandidate(candidate.id, {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        status: data.status as CandidateDto['status'],
      });
      toast.success('Candidate updated!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Update failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Edit candidate</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Field.Text name="name" label="Name" />
          <Field.Text name="email" label="Email address" />
          <Field.Text name="phone" label="Phone (optional)" />
          <Field.Select name="status" label="Status">
            {CANDIDATE_STATUS_OPTIONS.filter((option) => option !== 'HIRED').map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Field.Select>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Save changes
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
