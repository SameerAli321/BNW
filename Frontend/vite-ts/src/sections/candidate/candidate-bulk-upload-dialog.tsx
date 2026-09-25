import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import { fData } from 'src/utils/format-number';

import { bulkUploadCandidateCvs } from 'src/actions/candidates';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaHelper } from 'src/components/hook-form';

// ----------------------------------------------------------------------
// `POST /candidates/bulk-upload` — HR, ADMIN. Multipart, field `files` (multiple, PDF only, same
// MAX_DOCUMENT_SIZE_BYTES / PDF-only filter pattern the backend reuses from
// employee-documents.storage.ts) — see docs/API_CONTRACT_SPRINT5.md.

const MAX_SIZE = 10 * 1024 * 1024; // 10MB, matches the existing document-upload limit

const ACCEPTED_MIME = { 'application/pdf': [] };

export type BulkUploadCvsSchemaType = zod.infer<typeof BulkUploadCvsSchema>;

export const BulkUploadCvsSchema = zod.object({
  files: schemaHelper.files({ message: 'At least one CV is required!', minFiles: 1 }),
});

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CandidateBulkUploadDialog({ open, onClose }: Props) {
  const methods = useForm<BulkUploadCvsSchemaType>({
    resolver: zodResolver(BulkUploadCvsSchema),
    defaultValues: { files: [] },
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
      const created = await bulkUploadCandidateCvs(data.files as File[]);
      toast.success(`${created.length} candidate${created.length === 1 ? '' : 's'} added!`);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Upload failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Bulk upload CVs</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ mb: 2 }}>
            Upload one or more CVs (PDF only). A candidate is created for each file, named from
            its filename — edit the name/email afterwards.
          </DialogContentText>

          <Field.Upload
            multiple
            name="files"
            maxSize={MAX_SIZE}
            accept={ACCEPTED_MIME}
            helperText={`Allowed *.pdf — max size ${fData(MAX_SIZE)} per file`}
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
