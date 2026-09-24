import type { StaffSummaryRowDto } from 'src/types/employee-record';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  row: StaffSummaryRowDto;
  recordHref: string;
};

export function StaffSummaryTableRow({ row, recordHref }: Props) {
  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar alt={row.fullName}>{row.fullName.charAt(0).toUpperCase()}</Avatar>

          <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
            <Link
              component={RouterLink}
              href={recordHref}
              color="inherit"
              sx={{ cursor: 'pointer' }}
            >
              {row.fullName}
            </Link>
            <Box component="span" sx={{ color: 'text.disabled' }}>
              {row.email}
            </Box>
          </Stack>
        </Box>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employeeCode || '—'}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.departmentName || '—'}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.designation || '—'}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.managerName || '—'}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Label variant="soft" color="default">
          {row.role}
        </Label>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.joinDate ? fDate(row.joinDate) : '—'}</TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={
            (row.status === 'ACTIVE' && 'success') ||
            (row.status === 'ONBOARDING' && 'warning') ||
            (row.status === 'INACTIVE' && 'error') ||
            'default'
          }
        >
          {row.status}
        </Label>
      </TableCell>

      <TableCell align="center">{row.documentCount}</TableCell>

      <TableCell align="right">
        <Link component={RouterLink} href={recordHref} sx={{ typography: 'body2' }}>
          View record
        </Link>
      </TableCell>
    </TableRow>
  );
}
