import type { UserDto } from 'src/types/user';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { avatarSrc } from 'src/actions/users';
import { fPkr } from 'src/actions/work-orders';

import { Label } from 'src/components/label';

import { userStatusLabel } from 'src/types/user';

// ----------------------------------------------------------------------

type Props = {
  user: UserDto;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        component="span"
        variant="caption"
        sx={{ color: 'text.disabled', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </Typography>
    </Box>
  );
}

const date = (value?: string | null) => (value ? fDate(value) : null);
const money = (value?: number | null) =>
  value === null || value === undefined ? null : fPkr(value);

/**
 * "Employee Information" — the client's headings, in their order. The salary block only appears
 * for HR / ADMIN: the backend leaves those fields out of the response for everyone else.
 */
export function EmployeeRecordBasicInfo({ user }: Props) {
  const fullName = `${user.firstName} ${user.lastName}`;
  const showsSalary = user.currentSalary !== undefined;

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Avatar
          alt={fullName}
          src={avatarSrc(user.avatarUrl)}
          sx={{ width: 96, height: 96, mx: 'auto', mb: 2, fontSize: 32 }}
        >
          {fullName.charAt(0).toUpperCase()}
        </Avatar>

        <Typography variant="h6">{fullName}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {user.designation || user.role}
        </Typography>

        <Label
          variant="soft"
          color={
            (user.status === 'ACTIVE' && 'success') ||
            (user.status === 'INACTIVE' && 'error') ||
            'default'
          }
        >
          {userStatusLabel(user.status)}
        </Label>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Employee Information
      </Typography>
      <InfoRow label="Employee name" value={fullName} />
      <InfoRow label="Employee code" value={user.employeeCode} />
      <InfoRow label="Job title" value={user.designation} />
      <InfoRow label="Department" value={user.departmentName} />
      <InfoRow label="Reporting manager" value={user.managerName} />
      <InfoRow label="Date of joining" value={date(user.joinDate)} />
      <InfoRow label="Contact number" value={user.contactNumber} />
      {showsSalary && (
        <>
          <InfoRow label="Current salary" value={money(user.currentSalary)} />
          <InfoRow label="Previous salary" value={money(user.previousSalary)} />
          <InfoRow label="Deduction policy" value={user.deductionPolicy} />
          <InfoRow label="Last salary change date" value={date(user.lastSalaryChangeDate)} />
        </>
      )}
      <InfoRow label="Email" value={user.email} />
      <InfoRow label="CNIC" value={user.cnic} />
      <InfoRow label="Status" value={userStatusLabel(user.status)} />
      <InfoRow label="Leaving date" value={date(user.leavingDate)} />
      <InfoRow label="Role" value={user.role} />
    </Card>
  );
}
