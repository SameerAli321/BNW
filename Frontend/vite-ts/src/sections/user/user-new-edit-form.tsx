import type { IUserItem } from 'src/types/user';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createUser, updateUser, useGetUsers, useGetDepartments } from 'src/actions/users';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';

import {
  userRoleLabel,
  USER_FORM_DEPARTMENTS,
  USER_FORM_ROLE_OPTIONS,
  USER_ACCOUNT_STATUS_OPTIONS,
} from 'src/types/user';

// ----------------------------------------------------------------------

export type NewUserSchemaType = zod.infer<ReturnType<typeof buildUserSchema>>;

const amount = zod
  .string()
  .optional()
  .refine((value) => !value || /^\d+(\.\d{1,2})?$/.test(value.trim()), {
    message: 'Enter an amount in rupees (up to 2 decimals)',
  });

// A cleared picker stores 'Invalid Date' — treat it as empty.
const toDate = (value?: string) =>
  value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : null;
const toAmount = (value?: string) => (value && value.trim() !== '' ? Number(value) : null);
const amountText = (value?: number | null) =>
  value === null || value === undefined ? '' : String(value);

/**
 * `isEdit` toggles whether `password` is required: mandatory when creating a new user (HR/ADMIN
 * must set it up front, no more auto-generated fallback), optional when editing (blank = leave the
 * current password unchanged, via PATCH /users/:id).
 */
function buildUserSchema(isEdit: boolean) {
  return zod
    .object({
      firstName: zod.string().min(1, { message: 'First name is required!' }),
      lastName: zod.string().min(1, { message: 'Last name is required!' }),
      employeeCode: zod.string().max(30, { message: 'Up to 30 characters' }).optional(),
      designation: zod.string().optional(),
      departmentId: zod.union([zod.number(), zod.literal('')]).optional(),
      managerId: zod.union([zod.number(), zod.literal('')]).optional(),
      joinDate: zod.string().optional(),
      contactNumber: zod
        .string()
        .optional()
        .refine((value) => !value || /^\+?[0-9][0-9\s-]{6,19}$/.test(value.trim()), {
          message: 'Enter a phone number, e.g. 0300-1234567',
        }),
      currentSalary: amount,
      previousSalary: amount,
      deductionPolicy: zod.string().max(1000).optional(),
      lastSalaryChangeDate: zod.string().optional(),
      email: zod
        .string()
        .min(1, { message: 'Email is required!' })
        .email({ message: 'Email must be a valid email address!' }),
      cnic: zod
        .string()
        .optional()
        .refine((value) => !value || /^\d{13}$/.test(value.replace(/[\s-]/g, '')), {
          message: 'CNIC must be 13 digits, e.g. 35202-1234567-1',
        }),
      status: zod.string().optional(),
      leavingDate: zod.string().optional(),
      role: zod.string().min(1, { message: 'Role is required!' }),
      password: isEdit
        ? zod
            .string()
            .optional()
            .refine((value) => !value || value.length >= 8, {
              message: 'Password must be at least 8 characters!',
            })
        : zod
            .string()
            .min(8, { message: 'Password is required and must be at least 8 characters!' }),
    })
    .refine(
      (data) =>
        !data.joinDate ||
        !data.leavingDate ||
        !dayjs(data.leavingDate).isBefore(dayjs(data.joinDate), 'day'),
      { message: 'Leaving date cannot be before the date of joining', path: ['leavingDate'] }
    )
    .refine(
      (data) =>
        !data.lastSalaryChangeDate || !dayjs(data.lastSalaryChangeDate).isAfter(dayjs(), 'day'),
      { message: 'Cannot be in the future', path: ['lastSalaryChangeDate'] }
    );
}

/** '3520212345671' → '35202-1234567-1' (leaves anything else as typed for the validator). */
function formatCnic(value?: string): string | null {
  const digits = (value ?? '').replace(/[\s-]/g, '');
  if (!digits) return null;
  return /^\d{13}$/.test(digits)
    ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
    : (value ?? '').trim();
}

// ----------------------------------------------------------------------

type Props = {
  currentUser?: IUserItem;
};

export function UserNewEditForm({ currentUser }: Props) {
  const router = useRouter();
  const isEdit = !!currentUser;

  const { users } = useGetUsers({ limit: 200 });
  const { departments } = useGetDepartments();

  // A user can't be their own manager.
  const managerOptions = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id),
    [users, currentUser?.id]
  );

  // The client's four departments, in their order — plus the user's current one when editing
  // someone already in an older department, so it isn't silently lost.
  const departmentOptions = useMemo(
    () =>
      departments
        .filter((d) => USER_FORM_DEPARTMENTS.includes(d.name) || d.id === currentUser?.departmentId)
        .sort((a, b) => {
          const rank = (name: string) =>
            USER_FORM_DEPARTMENTS.includes(name) ? USER_FORM_DEPARTMENTS.indexOf(name) : 99;
          return rank(a.name) - rank(b.name);
        }),
    [departments, currentUser?.departmentId]
  );

  // Same for roles: the agreed four, plus an older role (HR / Payroll) a user may already have.
  const roleOptions = useMemo(
    () =>
      currentUser && !USER_FORM_ROLE_OPTIONS.some((o) => o.value === currentUser.role)
        ? [
            ...USER_FORM_ROLE_OPTIONS,
            { value: currentUser.role, label: userRoleLabel(currentUser.role) },
          ]
        : USER_FORM_ROLE_OPTIONS,
    [currentUser]
  );

  const defaultValues: NewUserSchemaType = {
    firstName: '',
    lastName: '',
    employeeCode: '',
    designation: '',
    departmentId: '',
    managerId: '',
    joinDate: '',
    contactNumber: '',
    currentSalary: '',
    previousSalary: '',
    deductionPolicy: '',
    lastSalaryChangeDate: '',
    email: '',
    cnic: '',
    status: 'ACTIVE',
    leavingDate: '',
    role: '',
    password: '',
  };

  const currentValues: NewUserSchemaType | undefined = useMemo(
    () =>
      currentUser
        ? {
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            employeeCode: currentUser.employeeCode ?? '',
            designation: currentUser.designation ?? '',
            departmentId: currentUser.departmentId ?? '',
            managerId: currentUser.managerId ?? '',
            joinDate: currentUser.joinDate ?? '',
            contactNumber: currentUser.contactNumber ?? '',
            currentSalary: amountText(currentUser.currentSalary),
            previousSalary: amountText(currentUser.previousSalary),
            deductionPolicy: currentUser.deductionPolicy ?? '',
            lastSalaryChangeDate: currentUser.lastSalaryChangeDate ?? '',
            email: currentUser.email,
            cnic: currentUser.cnic ?? '',
            status: currentUser.status,
            leavingDate: currentUser.leavingDate ?? '',
            role: currentUser.role,
            password: '',
          }
        : undefined,
    [currentUser]
  );

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const methods = useForm<NewUserSchemaType>({
    mode: 'onSubmit',
    resolver: zodResolver(buildUserSchema(isEdit)),
    defaultValues,
    values: currentValues,
  });

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty, dirtyFields, errors },
  } = methods;

  // Salary history: when HR changes the current salary of an existing employee, the old figure
  // becomes "Previous salary" and today becomes "Last salary change date" (still editable).
  const currentSalary = watch('currentSalary');
  const status = watch('status');
  const leavingDate = watch('leavingDate');
  useEffect(() => {
    if (!currentValues || dirtyFields.previousSalary || dirtyFields.lastSalaryChangeDate) return;
    const original = currentValues.currentSalary ?? '';
    const changed =
      (currentSalary ?? '').trim() !== '' && Number(currentSalary) !== Number(original);
    if (changed && original !== '') {
      setValue('previousSalary', original);
      setValue('lastSalaryChangeDate', dayjs().format('YYYY-MM-DD'));
    } else if (changed) {
      setValue('lastSalaryChangeDate', dayjs().format('YYYY-MM-DD'));
    } else {
      setValue('previousSalary', currentValues.previousSalary ?? '');
      setValue('lastSalaryChangeDate', currentValues.lastSalaryChangeDate ?? '');
    }
  }, [
    currentSalary,
    currentValues,
    dirtyFields.previousSalary,
    dirtyFields.lastSalaryChangeDate,
    setValue,
  ]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        role: data.role as IUserItem['role'],
        employeeCode: data.employeeCode?.trim() || null,
        managerId: data.managerId === '' ? null : data.managerId,
        departmentId: data.departmentId === '' ? null : data.departmentId,
        designation: data.designation?.trim() || null,
        joinDate: toDate(data.joinDate),
        leavingDate: toDate(data.leavingDate),
        contactNumber: data.contactNumber?.trim() || null,
        cnic: formatCnic(data.cnic),
        currentSalary: toAmount(data.currentSalary),
        previousSalary: toAmount(data.previousSalary),
        deductionPolicy: data.deductionPolicy?.trim() || null,
        lastSalaryChangeDate: toDate(data.lastSalaryChangeDate),
        ...(data.status ? { status: data.status as IUserItem['status'] } : {}),
      };

      if (currentUser) {
        await updateUser(currentUser.id, {
          ...payload,
          ...(data.password ? { password: data.password } : {}),
        });
      } else {
        const created = await createUser({ ...payload, password: data.password ?? '' });
        const mail = created.welcomeEmail;
        if (mail?.status === 'SENT') {
          toast.success(`User created — sign-in details emailed to ${mail.sentTo}`);
        } else {
          toast.warning(
            mail?.status === 'FAILED'
              ? `User created, but the welcome email could not be sent: ${mail.error ?? 'unknown error'}. Share the sign-in details with them directly.`
              : 'User created, but email is not set up on the server — share the sign-in details with them directly.',
            { duration: 10000 }
          );
        }
        router.push(paths.dashboard.user.list);
        return;
      }

      toast.success('Update success!');
      router.push(paths.dashboard.user.list);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong!');
    }
  });

  const rupees = {
    input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
    htmlInput: { inputMode: 'decimal' as const },
  };
  const twoColumns = {
    rowGap: 3,
    columnGap: 2,
    display: 'grid',
    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
  };

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
              sx={{ mb: 3 }}
            >
              <Typography variant="h6">Employee Information</Typography>
              {currentUser?.mustChangePassword && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Must change password on next login
                </Typography>
              )}
            </Stack>

            {/* Same order as the client's "Employee Information" headings. */}
            <Box sx={twoColumns}>
              <Field.Text name="firstName" label="Employee name — first name" />
              <Field.Text name="lastName" label="Employee name — last name" />

              <Field.Text name="employeeCode" label="Employee code" placeholder="e.g. BNW-0042" />
              <Field.Text name="designation" label="Job title" />

              <Field.Select name="departmentId" label="Department">
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {departmentOptions.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </Field.Select>
              <Field.Select name="managerId" label="Reporting manager">
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {managerOptions.map((manager) => (
                  <MenuItem key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.DatePicker name="joinDate" label="Date of joining" />
              <Field.Text
                name="contactNumber"
                label="Contact number"
                placeholder="0300-1234567"
                slotProps={{ htmlInput: { inputMode: 'tel' } }}
              />

              <Field.Text name="currentSalary" label="Current salary" slotProps={rupees} />
              <Field.Text
                name="previousSalary"
                label="Previous salary"
                slotProps={rupees}
                helperText={
                  isEdit ? 'Filled in automatically when the current salary changes' : undefined
                }
              />

              <Field.Text
                name="deductionPolicy"
                label="Deduction policy"
                placeholder="e.g. Income tax as per slab + EOBI; unpaid leave deducted per day"
                multiline
                minRows={2}
              />
              <Field.DatePicker
                name="lastSalaryChangeDate"
                label="Last salary change date"
                disableFuture
                slotProps={{ field: { clearable: true } }}
              />

              <Field.Text name="email" label="Email" />
              <Field.Text
                name="cnic"
                label="CNIC"
                placeholder="35202-1234567-1"
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 15 } }}
              />

              <Field.Select name="status" label="Status">
                {USER_ACCOUNT_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Field.Select>
              <Field.DatePicker
                name="leavingDate"
                label="Leaving date"
                slotProps={{
                  field: { clearable: true },
                  textField:
                    toDate(leavingDate) && status === 'ACTIVE' && !errors.leavingDate
                      ? {
                          helperText:
                            'Set Status to Inactive once they have left — inactive users cannot sign in.',
                        }
                      : {},
                }}
              />
            </Box>

            <Divider sx={{ my: 4, borderStyle: 'dashed' }} />

            <Typography variant="h6" sx={{ mb: 3 }}>
              Account access
            </Typography>
            <Box sx={twoColumns}>
              <Field.Select name="role" label="Role">
                {roleOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Field.Select>
              <Field.Text
                name="password"
                label={currentUser ? 'New password' : 'Password'}
                placeholder={currentUser ? 'Leave blank to keep the current password' : undefined}
                type="text"
                helperText={
                  currentUser
                    ? 'Sets this exact password for the user and requires them to change it on next login. Minimum 8 characters.'
                    : 'Sets this new user’s password. They must change it on first login. Minimum 8 characters.'
                }
              />
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              justifyContent="flex-end"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ mt: 3 }}
            >
              {currentUser && isDirty && (
                <Typography variant="body2" sx={{ color: 'warning.main', mr: { sm: 'auto' } }}>
                  You have unsaved changes
                </Typography>
              )}
              {currentUser && (
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={!isDirty || isSubmitting}
                  onClick={() => setConfirmDiscard(true)}
                >
                  Cancel changes
                </Button>
              )}
              <Button type="submit" variant="contained" loading={isSubmitting}>
                {!currentUser ? 'Create user' : 'Save changes'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard your changes?"
        content="Everything you've changed on this form will be undone and the last saved details shown again. Nothing is saved."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDiscard(false);
              // Back to exactly what's saved for this team member (nothing is sent to the server).
              reset(currentValues);
              toast.info('Changes discarded — showing the last saved details');
            }}
          >
            Discard changes
          </Button>
        }
      />
    </Form>
  );
}
