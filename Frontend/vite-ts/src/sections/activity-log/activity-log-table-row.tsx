import type { ActivityLogDto } from 'src/types/activity-log';

import { useBoolean } from 'minimal-shared/hooks';

import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { ActivityCategoryLabel } from './activity-category-label';

// ----------------------------------------------------------------------

type Props = {
  row: ActivityLogDto;
  /** Multi-person views (team / managers / all staff) show who logged it. */
  showEmployee: boolean;
  /** Only the caller's own entries ("My Activity") can be edited or deleted. */
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ActivityLogTableRow({ row, showEmployee, canEdit, onEdit, onDelete }: Props) {
  const confirmDialog = useBoolean();

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.activityDate)}</TableCell>

        {showEmployee && (
          <TableCell sx={{ whiteSpace: 'nowrap' }}>
            <Typography variant="subtitle2">{row.userName}</Typography>
            {row.userRole && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {row.userRole}
              </Typography>
            )}
          </TableCell>
        )}

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <ActivityCategoryLabel category={row.category} />
        </TableCell>

        <TableCell sx={{ minWidth: 280, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {row.description}
        </TableCell>

        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {row.hours}
        </TableCell>

        {canEdit && (
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
            <Tooltip title="Edit">
              <IconButton onClick={onEdit}>
                <Iconify icon="solar:pen-bold" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton color="error" onClick={confirmDialog.onTrue}>
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </Tooltip>
          </TableCell>
        )}
      </TableRow>

      <ConfirmDialog
        open={confirmDialog.value}
        onClose={confirmDialog.onFalse}
        title="Delete"
        content="Delete this activity entry? This can't be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              confirmDialog.onFalse();
              onDelete();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
