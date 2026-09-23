import type { DocumentTypeDto } from 'src/types/employee-record';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { fData } from 'src/utils/format-number';

import { uploadEmployeeDocument } from 'src/actions/employee-records';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaHelper } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const MAX_SIZE = 10 * 1024 * 1024; // 10MB, per docs/API_CONTRACT_SPRINT2.md

const ACCEPTED_MIME = {
  'application/pdf': [],
  'image/png': [],
  'image/jpeg': [],
  'application/msword': [],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
};

export type UploadDocumentSchemaType = zod.infer<typeof UploadDocumentSchema>;

export const UploadDocumentSchema = zod.object({
  // Kept as `number | ''` (not `.refine()`'d down to `number`) so the inferred type matches the
  // form's default value type exactly — the "document type is required" check happens in
  // `onSubmit` below instead, same "keep zod output == form input" discipline as
  // src/sections/user/user-new-edit-form.tsx's `managerId`/`departmentId` fields.
  documentTypeId: zod.union([zod.number(), zod.literal('')]),
  file: schemaHelper.file({ message: 'A file is required!' }),
});

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number | string;
  documentTypes: DocumentTypeDto[];
};

export function EmployeeDocumentUploadDialog({ open, onClose, userId, documentTypes }: Props) {
  const methods = useForm<UploadDocumentSchemaType>({
    resolver: zodResolver(UploadDocumentSchema),
    defaultValues: { documentTypeId: '', file: null },
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
      await uploadEmployeeDocument(userId, {
        file: data.file as File,
        documentTypeId: data.documentTypeId,
      });
      toast.success('Document uploaded!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Upload failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Upload document</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Field.Select name="documentTypeId" label="Document type">
            {documentTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </Field.Select>

          <Field.Upload
            name="file"
            maxSize={MAX_SIZE}
            accept={ACCEPTED_MIME}
            helperText={`Allowed *.pdf, *.png, *.jpg, *.doc, *.docx — max size ${fData(MAX_SIZE)}`}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Upload
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
