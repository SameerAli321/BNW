import type { IUserItem } from 'src/types/user';

import { useState, useCallback } from 'react';
import { useBoolean, usePopover, useCopyToClipboard } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { resetUserPassword } from 'src/actions/users';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

type Props = {
  row: IUserItem;
  selected: boolean;
  editHref: string;
  canDelete: boolean;
  canResetPassword: boolean;
  onSelectRow: () => void;
  onDeleteRow: () => void;
};

export function UserTableRow({
  row,
  selected,
  editHref,
  canDelete,
  canResetPassword,
  onSelectRow,
  onDeleteRow,
}: Props) {
  const menuActions = usePopover();
  const confirmDialog = useBoolean();
  const resetPasswordDialog = useBoolean();
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const { copy } = useCopyToClipboard();

  const fullName = `${row.firstName} ${row.lastName}`;

  const handleResetPassword = useCallback(async () => {
    setResetting(true);
    try {
      const { tempPassword: newPassword } = await resetUserPassword(row.id);
      setTempPassword(newPassword);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Password reset failed!');
      resetPasswordDialog.onFalse();
    } finally {
      setResetting(false);
    }
  }, [row.id, resetPasswordDialog]);

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <li>
          <MenuItem component={RouterLink} href={editHref} onClick={() => menuActions.onClose()}>
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>
        </li>

        {canResetPassword && (
          <MenuItem
            onClick={() => {
              setTempPassword(null);
              resetPasswordDialog.onTrue();
              menuActions.onClose();
            }}
          >
            <Iconify icon="solar:lock-password-outline" />
            Reset password
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem
            onClick={() => {
              confirmDialog.onTrue();
              menuActions.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        )}
      </MenuList>
    </CustomPopover>
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content="Are you sure want to delete this user? This deactivates the account (soft delete)."
      action={
        <Button variant="contained" color="error" onClick={onDeleteRow}>
          Delete
        </Button>
      }
    />
  );

  const renderResetPasswordDialog = () => (
    <Dialog
      open={resetPasswordDialog.value}
      onClose={() => {
        setTempPassword(null);
        resetPasswordDialog.onFalse();
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Reset password</DialogTitle>

      <DialogContent>
        {tempPassword ? (
          <Stack spacing={1.5}>
            <Box component="span">
              A new temporary password was generated for <b>{fullName}</b>. Share it with them —
              it will not be shown again.
            </Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: 1.5,
                borderRadius: 1,
                typography: 'subtitle1',
                bgcolor: 'background.neutral',
                fontFamily: 'monospace',
              }}
            >
              {tempPassword}
              <IconButton
                size="small"
                onClick={() => {
                  copy(tempPassword);
                  toast.success('Copied!');
                }}
              >
                <Iconify icon="solar:copy-bold" />
              </IconButton>
            </Stack>
          </Stack>
        ) : (
          <Box component="span">
            This generates a brand new temporary password for <b>{fullName}</b> and invalidates
            their current one. Continue?
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {tempPassword ? (
          <Button
            variant="contained"
            onClick={() => {
              setTempPassword(null);
              resetPasswordDialog.onFalse();
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button onClick={resetPasswordDialog.onFalse}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              loading={resetting}
              onClick={handleResetPassword}
            >
              Reset password
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            slotProps={{
              input: {
                id: `${row.id}-checkbox`,
                'aria-label': `${row.id} checkbox`,
              },
            }}
          />
        </TableCell>

        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={fullName}>{fullName.charAt(0).toUpperCase()}</Avatar>

            <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Link
                component={RouterLink}
                href={editHref}
                color="inherit"
                sx={{ cursor: 'pointer' }}
              >
                {fullName}
              </Link>
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {row.email}
              </Box>
            </Stack>
          </Box>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.designation || '—'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.departmentName || '—'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.managerName || '—'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Label variant="soft" color="default">
            {row.role}
          </Label>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row.joinDate ? fDate(row.joinDate) : '—'}
        </TableCell>

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

        <TableCell>
          <IconButton
            color={menuActions.open ? 'inherit' : 'default'}
            onClick={menuActions.onOpen}
          >
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      {renderMenuActions()}
      {renderConfirmDialog()}
      {renderResetPasswordDialog()}
    </>
  );
}
