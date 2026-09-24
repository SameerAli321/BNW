import type { UserDto } from 'src/types/user';

import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  user: UserDto;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <Typography
        component="span"
        variant="caption"
        sx={{ color: 'text.disabled', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {value ?? '—'}
      </Typography>
    </>
  );
}

export function EmployeeRecordBasicInfo({ user }: Props) {
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <Card sx={{ p: 3, textAlign: 'center' }}>
      <Avatar alt={fullName} sx={{ width: 96, height: 96, mx: 'auto', mb: 2, fontSize: 32 }}>
        {fullName.charAt(0).toUpperCase()}
      </Avatar>

      <Typography variant="h6">{fullName}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        {user.email}
      </Typography>

      <Label
        variant="soft"
        color={
          (user.status === 'ACTIVE' && 'success') ||
          (user.status === 'ONBOARDING' && 'warning') ||
          (user.status === 'INACTIVE' && 'error') ||
          'default'
        }
      >
        {user.status}
      </Label>

      <Divider sx={{ my: 3 }} />

      <InfoRow label="Employee code" value={user.employeeCode} />
      <InfoRow label="Role" value={user.role} />
      <InfoRow label="Designation" value={user.designation} />
      <InfoRow label="Department" value={user.departmentName} />
      <InfoRow label="Manager" value={user.managerName} />
      <InfoRow label="Join date" value={user.joinDate ? fDate(user.joinDate) : null} />
    </Card>
  );
}
