import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { useAuthContext } from 'src/auth/hooks';

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
// docs/API_CONTRACT_GAPS_FIX.md Gap 1) — this tab is just "who am I in the system".
export function AccountGeneral() {
  const { user } = useAuthContext();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ pt: 10, pb: 5, px: 3, textAlign: 'center' }}>
          <Avatar sx={{ width: 96, height: 96, mx: 'auto', mb: 2, fontSize: 36 }}>
            {fullName ? fullName[0] : '?'}
          </Avatar>
          <Typography variant="h6">{fullName || '—'}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {user?.email}
          </Typography>
          {user?.role && <Label color="primary">{user.role}</Label>}
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ p: 3 }}>
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
                  <Label color={user.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {user.status}
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
