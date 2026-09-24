import type { LetterTemplateDto } from 'src/types/letter';

import Link from '@mui/material/Link';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  row: LetterTemplateDto;
  editHref?: string;
};

export function LetterTemplateTableRow({ row, editHref }: Props) {
  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {editHref ? (
          <Link component={RouterLink} href={editHref} color="inherit" sx={{ cursor: 'pointer' }}>
            {row.name}
          </Link>
        ) : (
          row.name
        )}
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.type}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.roleScope || '—'}</TableCell>

      <TableCell align="center">{row.version}</TableCell>

      <TableCell align="center">{row.fieldsSchema.length}</TableCell>

      <TableCell>
        <Label variant="soft" color={row.isActive ? 'success' : 'default'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Label>
      </TableCell>

      <TableCell align="right">
        {editHref && (
          <Link component={RouterLink} href={editHref} sx={{ typography: 'body2' }}>
            Edit
          </Link>
        )}
      </TableCell>
    </TableRow>
  );
}
