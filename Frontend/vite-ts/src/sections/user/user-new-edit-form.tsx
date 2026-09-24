import type { IUserItem } from 'src/types/user';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createUser, updateUser, useGetUsers, useGetDepartments } from 'src/actions/users';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { USER_ROLE_OPTIONS, USER_ACCOUNT_STATUS_OPTIONS } from 'src/types/user';

// ----------------------------------------------------------------------

export type NewUserSchemaType = zod.infer<typeof NewUserSchema>;

export const NewUserSchema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  role: zod.string().min(1, { message: 'Role is required!' }),
  managerId: zod.union([zod.number(), zod.literal('')]).optional(),
  departmentId: zod.union([zod.number(), zod.literal('')]).optional(),
  designation: zod.string().optional(),
  joinDate: zod.string().optional(),
  status: zod.string().optional(),
  password: zod
    .string()
    .optional()
    .refine((value) => !value || value.length >= 8, {
      message: 'Password must be at least 8 characters!',
    }),
});

// ----------------------------------------------------------------------

type Props = {
  currentUser?: IUserItem;
};

export function UserNewEditForm({ currentUser }: Props) {
  const router = useRouter();

  const { users } = useGetUsers({ limit: 200 });
  const { departments } = useGetDepartments();

  // A user can't be their own manager.
  const managerOptions = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id),
    [users, currentUser?.id]
  );

  const defaultValues: NewUserSchemaType = {
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    managerId: '',
    departmentId: '',
    designation: '',
    joinDate: '',
    status: '',
    password: '',
  };

  const currentValues: NewUserSchemaType | undefined = currentUser
    ? {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        role: currentUser.role,
        managerId: currentUser.managerId ?? '',
        departmentId: currentUser.departmentId ?? '',
        designation: currentUser.designation ?? '',
        joinDate: currentUser.joinDate ?? '',
        status: currentUser.status,
        password: '',
      }
    : undefined;

  const methods = useForm<NewUserSchemaType>({
    mode: 'onSubmit',
    resolver: zodResolver(NewUserSchema),
    defaultValues,
    values: currentValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role as IUserItem['role'],
        managerId: data.managerId === '' ? null : data.managerId,
        departmentId: data.departmentId === '' ? null : data.departmentId,
        designation: data.designation || null,
        joinDate: data.joinDate ? dayjs(data.joinDate).format('YYYY-MM-DD') : null,
      };

      if (currentUser) {
        await updateUser(currentUser.id, {
          ...payload,
          ...(data.status ? { status: data.status as IUserItem['status'] } : {}),
          ...(data.password ? { password: data.password } : {}),
        });
      } else {
        await createUser(payload);
      }

      toast.success(currentUser ? 'Update success!' : 'Create success!');
      router.push(paths.dashboard.user.list);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong!');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card sx={{ p: 3 }}>
            {!currentUser && (
              <Alert severity="info" sx={{ mb: 3 }}>
                No password field — the backend generates a temporary password and emails (logs,
                for now) a &quot;set your password&quot; notice to the new user.
              </Alert>
            )}

            {currentUser?.mustChangePassword && (
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Must change password on next login
                </Typography>
              </Stack>
            )}

            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.Text name="firstName" label="First name" />
              <Field.Text name="lastName" label="Last name" />
              <Field.Text name="email" label="Email address" />

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
                {managerOptions.map((manager) => (
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

              {currentUser && (
                <Field.Select name="status" label="Status">
                  {USER_ACCOUNT_STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Field.Select>
              )}
            </Box>

            {currentUser && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Change password
                </Typography>
                <Field.Text
                  name="password"
                  label="New password"
                  placeholder="Leave blank to keep the current password"
                  type="text"
                  helperText="Sets this exact password for the user and requires them to change it on next login. Minimum 8 characters."
                  sx={{ maxWidth: { sm: 400 } }}
                />
              </Box>
            )}

            <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
              <Button type="submit" variant="contained" loading={isSubmitting}>
                {!currentUser ? 'Create user' : 'Save changes'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
