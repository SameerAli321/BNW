import type { UserRole } from 'src/types/user';
import type { CandidateDto } from 'src/types/candidate';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import { convertCandidate } from 'src/actions/candidates';
import { useGetUsers, useGetDepartments } from 'src/actions/users';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { USER_ROLE_OPTIONS } from 'src/types/user';

// ----------------------------------------------------------------------
// `POST /candidates/:id/convert` — HR, ADMIN. Body is `ConvertCandidateDto`: same shape as
// `CreateUserDto` minus `email`/`firstName`/`lastName` (defaulted from the candidate's own
// `name`/`email`, HR can override), including the mandatory min-8 `password` field — identical
// requirement to `UserNewEditForm`'s create mode (see docs/API_CONTRACT_SPRINT5.md).

export type ConvertCandidateSchemaType = zod.infer<typeof ConvertCandidateSchema>;

export const ConvertCandidateSchema = zod.object({
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
  email: zod.string().optional(),
  role: zod.string().min(1, { message: 'Role is required!' }),
  managerId: zod.union([zod.number(), zod.literal('')]).optional(),
  departmentId: zod.union([zod.number(), zod.literal('')]).optional(),
  designation: zod.string().optional(),
  joinDate: zod.string().optional(),
  employeeCode: zod.string().optional(),
  password: zod.string().min(8, { message: 'Password is required and must be at least 8 characters!' }),
});

type Props = {
  open: boolean;
  onClose: () => void;
  candidate: CandidateDto;
};

/** Splits the candidate's free-text `name` into a first/last name pair for the placeholder text. */
function splitName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return { first: first || name, last: rest.join(' ') };
}

export function CandidateConvertDialog({ open, onClose, candidate }: Props) {
  const { users } = useGetUsers({ limit: 200 });
  const { departments } = useGetDepartments();

  const { first: defaultFirstName, last: defaultLastName } = useMemo(
    () => splitName(candidate.name),
    [candidate.name]
  );

  const methods = useForm<ConvertCandidateSchemaType>({
    resolver: zodResolver(ConvertCandidateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      managerId: '',
      departmentId: '',
      designation: '',
      joinDate: '',
      employeeCode: '',
      password: '',
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const { user } = await convertCandidate(candidate.id, {
        role: data.role as UserRole,
        password: data.password,
        managerId: data.managerId === '' ? null : data.managerId,
        departmentId: data.departmentId === '' ? null : data.departmentId,
        designation: data.designation || null,
        joinDate: data.joinDate ? dayjs(data.joinDate).format('YYYY-MM-DD') : null,
        employeeCode: data.employeeCode || null,
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName ? { lastName: data.lastName } : {}),
        ...(data.email ? { email: data.email } : {}),
      });
      toast.success(`Converted to employee — ${user.firstName} ${user.lastName} can now log in!`);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Convert failed!');
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Convert to employee</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ mb: 2 }}>
            Creates a real user account for <strong>{candidate.name}</strong> ({candidate.email}).
            Leave name/email blank to use the candidate&apos;s own values.
          </DialogContentText>

          <Box
            sx={{
              rowGap: 3,
              columnGap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
            }}
          >
            <Field.Text name="firstName" label="First name" placeholder={defaultFirstName} />
            <Field.Text name="lastName" label="Last name" placeholder={defaultLastName} />
            <Field.Text
              name="email"
              label="Email address"
              placeholder={candidate.email}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />

            <Field.Select name="role" label="Role">
              {USER_ROLE_OPTIONS.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Field.Select>

            <Field.Select name="managerId" label="Manager">
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {users.map((manager) => (
                <MenuItem key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName}
                </MenuItem>
              ))}
            </Field.Select>

            <Field.Select name="departmentId" label="Department">
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {departments.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </Field.Select>

            <Field.Text name="designation" label="Designation" />
            <Field.DatePicker name="joinDate" label="Join date" />
            <Field.Text name="employeeCode" label="Employee code (optional)" />

            <Field.Text
              name="password"
              label="Password"
              type="text"
              helperText="Sets this new employee's password. They must change it on first login. Minimum 8 characters."
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Convert to employee
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
