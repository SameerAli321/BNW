import type { DocumentTypeDto } from 'src/types/employee-record';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { createDocumentRequest } from 'src/actions/employee-records';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type RequestDocumentSchemaType = zod.infer<typeof RequestDocumentSchema>;

export const RequestDocumentSchema = zod.object({
  // See the matching comment in employee-document-upload-dialog.tsx: kept as `number | ''` so the
  // inferred type matches the form's default value type; required-ness is checked in `onSubmit`.
  documentTypeId: zod.union([zod.number(), zod.literal('')]),
  dueDate: zod.string().optional(),
});

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number | string;
  documentTypes: DocumentTypeDto[];
};

export function EmployeeDocumentRequestDialog({ open, onClose, userId, documentTypes }: Props) {
  const methods = useForm<RequestDocumentSchemaType>({
    resolver: zodResolver(RequestDocumentSchema),
    defaultValues: { documentTypeId: '', dueDate: '' },
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
    if (data.documentTypeId === '') {
      toast.error('Document type is required!');
      return;
    }

    try {
      await createDocumentRequest(userId, {
        documentTypeId: data.documentTypeId,
        dueDate: data.dueDate ? dayjs(data.dueDate).format('YYYY-MM-DD') : null,
      });
      toast.success('Document requested!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Request failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Request document</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Field.Select name="documentTypeId" label="Document type">
            {documentTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </Field.Select>

          <Field.DatePicker name="dueDate" label="Due date (optional)" />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Request
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
