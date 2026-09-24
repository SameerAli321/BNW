import type { AppraisalRequestDto } from 'src/types/appraisal';

import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { AppraisalStatusLabel } from './appraisal-status-label';

// ----------------------------------------------------------------------

type Props = {
  row: AppraisalRequestDto;
  detailsHref: string;
};

export function AppraisalTableRow({ row, detailsHref }: Props) {
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Link component={RouterLink} href={detailsHref} color="inherit" sx={{ cursor: 'pointer' }}>
          {row.employeeName}
        </Link>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.managerName ?? '—'}</TableCell>

      <TableCell>
        <AppraisalStatusLabel status={row.status} />
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.submittedAt)}</TableCell>

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
