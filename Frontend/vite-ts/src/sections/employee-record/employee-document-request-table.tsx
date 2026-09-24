import type { DocumentRequestDto } from 'src/types/employee-record';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  requests: DocumentRequestDto[];
};

export function EmployeeDocumentRequestTable({ requests }: Props) {
  if (!requests.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader title="Document requests" sx={{ mb: 2 }} />

      <Scrollbar>
        <Table sx={{ minWidth: 480 }}>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due date</TableCell>
              <TableCell>Requested on</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} hover>
                <TableCell>{request.documentTypeName}</TableCell>
                <TableCell>
                  <Label variant="soft" color={request.status === 'RECEIVED' ? 'success' : 'warning'}>
                    {request.status}
                  </Label>
                </TableCell>
                <TableCell>{request.dueDate ? fDate(request.dueDate) : '—'}</TableCell>
                <TableCell>{fDate(request.createdAt)}</TableCell>
              </TableRow>
            ))}

            <TableNoData notFound={!requests.length} />
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );
}
