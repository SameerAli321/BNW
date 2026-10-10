import { useRef, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';

import {
  avatarSrc,
  AVATAR_ACCEPT,
  removeMyAvatar,
  uploadMyAvatar,
  AVATAR_MAX_BYTES,
} from 'src/actions/users';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { userStatusLabel } from 'src/types/user';

// ----------------------------------------------------------------------

type FieldProps = {
  label: string;
  value: React.ReactNode;
};

function ProfileField({ label, value }: FieldProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="subtitle2">{value ?? '—'}</Typography>
    </Stack>
  );
}

// BNW OMS: this used to be the minimal-kit's demo profile form — fake fields (country/state/
// city/zip/"about"/"public profile" toggle/avatar upload/"delete user" button) that don't exist
// anywhere in our backend and were never wired to the real `useMockedUser`. Never rewired since
// Sprint 1, so "my own profile" was showing made-up demo data. Replaced with a real, read-only
// summary of the actual logged-in user (core identity fields only — role/department/manager are
// HR/Admin-managed via the Users module, not self-editable). Contact details the person CAN edit
// themselves live on the "Personal details" tab next to this one (see
// docs/API_CONTRACT_GAPS_FIX.md Gap 1) — this tab is just "who am I in the system". The one thing
// editable here is the profile picture (click the avatar to upload / replace it).
export function AccountGeneral() {
  const { user, checkUserSession } = useAuthContext();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await checkUserSession?.(); // refresh the signed-in user so the header avatar updates too
      toast.success(success);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong!');
    } finally {
      setBusy(false);
    }
  };

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again later
    if (!file) return;
    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      toast.error('Choose a JPG, PNG or WEBP image');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('The picture must be 2 MB or smaller');
      return;
    }
    run(() => uploadMyAvatar(file), 'Profile picture updated!');
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ pt: { xs: 4, md: 6 }, pb: { xs: 3, md: 5 }, px: { xs: 2, md: 3 }, textAlign: 'center' }}>
          <input ref={fileInput} type="file" accept={AVATAR_ACCEPT} hidden onChange={onFileChosen} />
          <ButtonBase
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            aria-label="Change profile picture"
            sx={{
              p: 1,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              position: 'relative',
              border: (theme) => `1px dashed ${theme.vars.palette.divider}`,
              '&:hover .avatar-overlay': { opacity: 1 },
            }}
          >
            <Avatar
              src={avatarSrc(user?.avatarUrl)}
              alt={fullName}
              sx={{ width: 128, height: 128, fontSize: 44 }}
            >
              {fullName ? fullName[0] : '?'}
            </Avatar>
            <Box
              className="avatar-overlay"
              sx={{
                inset: 8,
                position: 'absolute',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                color: 'common.white',
                typography: 'caption',
                bgcolor: (theme) => varAlpha(theme.vars.palette.grey['900Channel'], 0.48),
                opacity: busy ? 1 : 0,
                transition: (theme) => theme.transitions.create('opacity'),
              }}
            >
              {busy ? (
                <CircularProgress size={28} color="inherit" />
              ) : (
                <>
                  <Iconify icon="solar:camera-add-bold" width={28} />
                  {user?.avatarUrl ? 'Change photo' : 'Upload photo'}
                </>
              )}
            </Box>
          </ButtonBase>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mb: 2 }}>
            JPG, PNG or WEBP, up to 2 MB
          </Typography>
          <Typography variant="h6">{fullName || '—'}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {user?.email}
          </Typography>
          {user?.role && <Label color="primary">{user.role}</Label>}
          {user?.avatarUrl && (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                color="error"
                disabled={busy}
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                onClick={() => run(removeMyAvatar, 'Profile picture removed')}
              >
                Remove photo
              </Button>
            </Box>
          )}
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            sx={{
              rowGap: 3,
              columnGap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
            }}
          >
            <ProfileField label="Employee code" value={user?.employeeCode} />
            <ProfileField label="Designation" value={user?.designation} />
            <ProfileField label="Department" value={user?.departmentName} />
            <ProfileField label="Manager" value={user?.managerName} />
            <ProfileField label="Join date" value={user?.joinDate ? fDate(user.joinDate) : null} />
            <ProfileField
              label="Status"
              value={
                user?.status && (
                  <Label color={user.status === 'ACTIVE' ? 'success' : 'error'}>
                    {userStatusLabel(user.status)}
                  </Label>
                )
              }
            />
          </Stack>

          <Typography variant="caption" sx={{ display: 'block', mt: 3, color: 'text.disabled' }}>
            These details are managed by HR/Admin. To update your phone, address, or other personal
            details, use the &ldquo;Personal details&rdquo; tab.
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
}
