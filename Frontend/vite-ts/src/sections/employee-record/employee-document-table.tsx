import type { EmployeeDocumentDto } from 'src/types/employee-record';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';
import { fData } from 'src/utils/format-number';

import { downloadDocument } from 'src/actions/employee-records';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  documents: EmployeeDocumentDto[];
};

export function EmployeeDocumentTable({ documents }: Props) {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

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
              <TableCell align="right">Download</TableCell>
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
                <TableCell align="right">
                  <IconButton
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                  >
                    <Iconify icon="solar:download-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            <TableNoData notFound={!documents.length} />
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );
}
