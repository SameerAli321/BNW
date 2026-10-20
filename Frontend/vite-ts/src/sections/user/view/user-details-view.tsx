import type { UserDto } from 'src/types/user';
import type { EmployeeProfileDto } from 'src/types/employee-profile';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { fPkr } from 'src/actions/work-orders';
import { DashboardContent } from 'src/layouts/dashboard';
import { avatarSrc, useGetUser } from 'src/actions/users';
import { useGetEmployeeProfile } from 'src/actions/employee-profile';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { EMPLOYEE_PROFILE_GENDER_OPTIONS } from 'src/types/employee-profile';
import { companyLabel, userRoleLabel, userStatusLabel, employmentTypeLabel } from 'src/types/user';

// ----------------------------------------------------------------------

const date = (value?: string | null) => (value ? fDate(value) : null);
const money = (value?: number | null) =>
  value === null || value === undefined ? null : fPkr(value);

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
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

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <Box
        sx={{
          p: 3,
          rowGap: 2.5,
          columnGap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
        }}
      >
        {children}
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

/**
 * Read-only view of one user's employee information (client item "Add view on users"). GET
 * /users/:id allows HR / ADMIN, the person themself and their direct manager; the salary block
 * only appears for HR / ADMIN because the backend leaves those fields out for everyone else.
 */
export function UserDetailsView({ id }: Props) {
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';
  const canEdit = currentRole === 'HR' || currentRole === 'ADMIN';

  const { user, userLoading, userError } = useGetUser(id);
  // Personal details — same access rule as the user itself; null when never filled in.
  const { profile } = useGetEmployeeProfile(user ? id : undefined);

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={fullName || 'User'}
        backHref={canEdit ? paths.dashboard.user.list : undefined}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          ...(canEdit ? [{ name: 'Users', href: paths.dashboard.user.list }] : []),
          { name: fullName || 'User' },
        ]}
        action={
          user && (
            <Stack direction="row" spacing={1}>
              <Button
                component={RouterLink}
                href={paths.dashboard.employees.record(user.id)}
                variant="outlined"
                startIcon={<Iconify icon="solar:file-text-bold" />}
              >
                E-record
              </Button>
              {canEdit && (
                <Button
                  component={RouterLink}
                  href={paths.dashboard.user.edit(String(user.id))}
                  variant="contained"
                  startIcon={<Iconify icon="solar:pen-bold" />}
                >
                  Edit
                </Button>
              )}
            </Stack>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {userLoading && <LoadingScreen />}

      {!userLoading && (userError || !user) && (
        <EmptyContent
          filled
          title="Unable to load this user"
          description="Either they don't exist, or you don't have permission to view them."
          sx={{ py: 10 }}
        />
      )}

      {!userLoading && user && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <UserSummaryCard user={user} />
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <UserInfoCards user={user} profile={profile} />
          </Grid>
        </Grid>
      )}
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function UserSummaryCard({ user }: { user: UserDto }) {
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <Card sx={{ p: 3, textAlign: 'center' }}>
      <Avatar
        alt={fullName}
        src={avatarSrc(user.avatarUrl)}
        sx={{ width: 112, height: 112, mx: 'auto', mb: 2, fontSize: 40 }}
      >
        {fullName.charAt(0).toUpperCase()}
      </Avatar>

      <Typography variant="h6">{fullName}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        {user.designation || userRoleLabel(user.role)}
      </Typography>

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        <Label variant="soft" color="default">
          {userRoleLabel(user.role)}
        </Label>
        <Label variant="soft" color={user.employmentType === 'INTERN' ? 'info' : 'default'}>
          {employmentTypeLabel(user.employmentType)}
        </Label>
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
      </Stack>

      <Stack spacing={1} sx={{ mt: 3, typography: 'body2', textAlign: 'left' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Iconify icon="solar:letter-bold" width={18} sx={{ color: 'text.disabled' }} />
          <Box component="span" sx={{ wordBreak: 'break-all' }}>
            {user.email}
          </Box>
        </Stack>
        {user.contactNumber && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="solar:phone-bold" width={18} sx={{ color: 'text.disabled' }} />
            <span>{user.contactNumber}</span>
          </Stack>
        )}
        {user.departmentName && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify
              icon="solar:users-group-rounded-bold"
              width={18}
              sx={{ color: 'text.disabled' }}
            />
            <span>{user.departmentName}</span>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function UserInfoCards({ user, profile }: { user: UserDto; profile: EmployeeProfileDto | null }) {
  const showsSalary = user.currentSalary !== undefined;
  const gender = EMPLOYEE_PROFILE_GENDER_OPTIONS.find((o) => o.value === profile?.gender)?.label;

  return (
    <Stack spacing={3}>
      <InfoCard title="Job">
        <InfoRow label="Employee code" value={user.employeeCode} />
        <InfoRow label="Job title" value={user.designation} />
        <InfoRow label="Department" value={user.departmentName} />
        <InfoRow label="Reporting manager" value={user.managerName} />
        <InfoRow label="Employment type" value={employmentTypeLabel(user.employmentType)} />
        <InfoRow label="Company" value={companyLabel(user.company)} />
        <InfoRow label="Role" value={userRoleLabel(user.role)} />
        <InfoRow label="Date of joining" value={date(user.joinDate)} />
        <InfoRow label="Leaving date" value={date(user.leavingDate)} />
      </InfoCard>

      <InfoCard title="Contact & identity">
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Contact number" value={user.contactNumber} />
        <InfoRow label="CNIC" value={user.cnic} />
        <InfoRow label="Address" value={profile?.address} />
      </InfoCard>

      <InfoCard title="Personal details">
        <InfoRow label="Date of birth" value={date(profile?.dateOfBirth)} />
        <InfoRow label="Gender" value={gender} />
        <InfoRow label="Emergency contact" value={profile?.emergencyContactName} />
        <InfoRow label="Emergency contact phone" value={profile?.emergencyContactPhone} />
        <InfoRow label="Bank" value={profile?.bankName} />
        <InfoRow label="Bank account number" value={profile?.bankAccountNumber} />
      </InfoCard>

      {showsSalary && (
        <InfoCard title="Compensation">
          <InfoRow label="Current salary" value={money(user.currentSalary)} />
          <InfoRow label="Previous salary" value={money(user.previousSalary)} />
          <InfoRow label="Last salary change date" value={date(user.lastSalaryChangeDate)} />
          <InfoRow label="Deduction policy" value={user.deductionPolicy} />
        </InfoCard>
      )}

      <InfoCard title="Account">
        <InfoRow label="Status" value={userStatusLabel(user.status)} />
        <InfoRow
          label="Password"
          value={user.mustChangePassword ? 'Must change on next sign-in' : 'Set by the user'}
        />
        <InfoRow label="Created" value={date(user.createdAt)} />
        <InfoRow label="Last updated" value={date(user.updatedAt)} />
      </InfoCard>
    </Stack>
  );
}
