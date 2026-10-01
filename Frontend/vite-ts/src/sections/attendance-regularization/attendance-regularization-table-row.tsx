import type { AttendanceRegularizationDto } from 'src/types/attendance-regularization';

import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { AttendanceRegularizationStatusLabel } from './attendance-regularization-status-label';

// ----------------------------------------------------------------------

type Props = {
  row: AttendanceRegularizationDto;
  detailsHref: string;
  showEmployee: boolean;
};

export function AttendanceRegularizationTableRow({ row, detailsHref, showEmployee }: Props) {
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Link component={RouterLink} href={detailsHref} color="inherit">
          {fDate(row.attendanceDate)}
        </Link>
      </TableCell>

      {showEmployee && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row.employeeName}
          {row.employeeCode ? ` (${row.employeeCode})` : ''}
        </TableCell>
      )}

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.timeArrival ?? '—'} / {row.timeDeparture ?? '—'}
      </TableCell>

      <TableCell
        sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {row.reason}
      </TableCell>

      <TableCell>
        <AttendanceRegularizationStatusLabel status={row.status} />
      </TableCell>

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
