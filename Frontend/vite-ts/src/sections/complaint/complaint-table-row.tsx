import type { ComplaintDto } from 'src/types/complaint';

import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { ComplaintStatusLabel } from './complaint-status-label';

// ----------------------------------------------------------------------

/** First filled section, as a one-line summary for the list. */
function summarize(row: ComplaintDto): string {
  if (row.description) return row.description;
  if (row.accessoryType || row.accessoryIssue) {
    return `Office accessory: ${[row.accessoryType, row.accessoryIssue].filter(Boolean).join(' — ')}`;
  }
  return `Maintenance: ${[row.maintenanceArea, row.maintenanceDescription].filter(Boolean).join(' — ')}`;
}

type Props = {
  row: ComplaintDto;
  detailsHref: string;
  showComplainant: boolean;
};

export function ComplaintTableRow({ row, detailsHref, showComplainant }: Props) {
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Link component={RouterLink} href={detailsHref} color="inherit">
          #{row.id}
        </Link>
      </TableCell>

      {showComplainant && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row.complainantName}
          {row.complainantDepartment ? ` (${row.complainantDepartment})` : ''}
        </TableCell>
      )}

      <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {summarize(row)}
      </TableCell>

      <TableCell>
        <ComplaintStatusLabel status={row.status} />
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.createdAt)}</TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip title="View">
          <IconButton component={RouterLink} href={detailsHref}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
