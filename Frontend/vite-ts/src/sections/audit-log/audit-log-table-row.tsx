import type { AuditLogDto } from 'src/types/audit-log';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  row: AuditLogDto;
};

export function AuditLogTableRow({ row }: Props) {
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.actorName || '— (unauthenticated)'}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Label variant="soft" color="default">
          {row.action}
        </Label>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.entity}
        {row.entityId != null ? ` #${row.entityId}` : ''}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.ipAddress || '—'}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(row.createdAt)}</TableCell>
    </TableRow>
  );
}
