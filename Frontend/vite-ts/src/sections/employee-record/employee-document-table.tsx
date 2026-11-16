import type { EmployeeDocumentDto } from 'src/types/employee-record';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';
import { fData } from 'src/utils/format-number';

import { endpoints } from 'src/lib/axios';
import { downloadDocument, deleteEmployeeDocument } from 'src/actions/employee-records';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePdfViewer, PdfViewerDialog } from 'src/components/pdf-viewer';

// ----------------------------------------------------------------------

type Props = {
  documents: EmployeeDocumentDto[];
  /** Whose E-record this is (to refresh it after a delete). */
  userId: number | string;
  /** HR / ADMIN: show Delete on uploaded files and CVs. */
  canDelete?: boolean;
};

/** Only these can be deleted — the others share their file with Letters, Appraisals etc. */
const DELETABLE_SOURCES = ['UPLOAD', 'CV'];

export function EmployeeDocumentTable({ documents, userId, canDelete = false }: Props) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<EmployeeDocumentDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteEmployeeDocument(userId, deleting.id);
      toast.success('Document deleted');
      setDeleting(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not delete the document');
    } finally {
      setDeleteBusy(false);
    }
  };
  const { openViewer, viewerProps } = usePdfViewer();

  const handleDownload = useCallback(async (doc: EmployeeDocumentDto) => {
    setDownloadingId(doc.id);
    try {
      await downloadDocument(doc.id, doc.originalName);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Download failed!');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return (
    <Card>
      <CardHeader title="Documents" subheader={`${documents.length} on file`} sx={{ mb: 2 }} />

      <Scrollbar>
        <Table sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Uploaded by</TableCell>
              <TableCell>Uploaded on</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id} hover>
                <TableCell>{doc.documentTypeName}</TableCell>
                <TableCell>
                  <Typography variant="body2">{doc.originalName}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    {fData(doc.size)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Label variant="soft" color="default">
                    {doc.source}
                  </Label>
                </TableCell>
                <TableCell>{doc.uploadedByName}</TableCell>
                <TableCell>{fDate(doc.createdAt)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="View">
                    <IconButton
                      onClick={() =>
                        openViewer({
                          title: `${doc.documentTypeName} — ${doc.originalName}`,
                          filename: doc.originalName,
                          url: endpoints.documents.download(doc.id),
                        })
                      }
                    >
                      <Iconify icon="solar:eye-bold" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      <Iconify icon="solar:download-bold" />
                    </IconButton>
                  </Tooltip>
                  {canDelete && DELETABLE_SOURCES.includes(doc.source) && (
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => setDeleting(doc)}>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}

            <TableNoData notFound={!documents.length} />
          </TableBody>
        </Table>
      </Scrollbar>

      <PdfViewerDialog {...viewerProps} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => !deleteBusy && setDeleting(null)}
        title="Delete document?"
        content={
          deleting && (
            <>
              <strong>{deleting.originalName}</strong> ({deleting.documentTypeName}) will be removed
              from this E-record and deleted from the server. This can&apos;t be undone.
            </>
          )
        }
        action={
          <Button variant="contained" color="error" loading={deleteBusy} onClick={handleDelete}>
            Delete
          </Button>
        }
      />
    </Card>
  );
}
