import type { EmployeeProfileGender } from 'src/types/employee-profile';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { updateEmployeeProfile, useGetEmployeeProfile } from 'src/actions/employee-profile';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { LoadingScreen } from 'src/components/loading-screen';

import { EMPLOYEE_PROFILE_GENDER_OPTIONS } from 'src/types/employee-profile';

// ----------------------------------------------------------------------
// BNW OMS — Gap-fix (Gap 1, `employee_profiles`), see docs/API_CONTRACT_GAPS_FIX.md. Shared
// "Personal details" form, reused from both the employee's own Account page (self-editing) and
// the HR/Admin Users edit page (editing anyone). Same react-hook-form + zod + Field.* pattern as
// src/sections/user/user-new-edit-form.tsx. All fields optional/nullable — the form never blocks
// on empty fields (per the contract, a profile is filled in over time, not required up front).

export type EmployeeProfileSchemaType = zod.infer<typeof EmployeeProfileSchema>;

export const EmployeeProfileSchema = zod.object({
  phone: zod.string().optional(),
  address: zod.string().optional(),
  dateOfBirth: zod.string().optional(),
  gender: zod.string().optional(),
  emergencyContactName: zod.string().optional(),
  emergencyContactPhone: zod.string().optional(),
  nationalId: zod.string().optional(),
  bankName: zod.string().optional(),
  bankAccountNumber: zod.string().optional(),
});

const defaultValues: EmployeeProfileSchemaType = {
  phone: '',
  address: '',
  dateOfBirth: '',
  gender: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  nationalId: '',
  bankName: '',
  bankAccountNumber: '',
};

// ----------------------------------------------------------------------

type Props = {
  userId: number | string;
  /** Card title/subheader — differs slightly between the Account page (self) and Users edit (HR/Admin). */
  title?: string;
  subheader?: string;
};

export function EmployeeProfileForm({
  userId,
  title = 'Personal details',
  subheader,
}: Props) {
  const { profile, profileLoading } = useGetEmployeeProfile(userId);

  const currentValues: EmployeeProfileSchemaType | undefined = profile
    ? {
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        gender: profile.gender ?? '',
        emergencyContactName: profile.emergencyContactName ?? '',
        emergencyContactPhone: profile.emergencyContactPhone ?? '',
        nationalId: profile.nationalId ?? '',
        bankName: profile.bankName ?? '',
        bankAccountNumber: profile.bankAccountNumber ?? '',
      }
    : undefined;

  const methods = useForm<EmployeeProfileSchemaType>({
    mode: 'onSubmit',
    resolver: zodResolver(EmployeeProfileSchema),
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
        phone: data.phone || null,
        address: data.address || null,
        dateOfBirth: data.dateOfBirth ? dayjs(data.dateOfBirth).format('YYYY-MM-DD') : null,
        gender: (data.gender || null) as EmployeeProfileGender | null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        nationalId: data.nationalId || null,
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
      };

      await updateEmployeeProfile(userId, payload);
      toast.success('Personal details saved!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong!');
    }
  });

  if (profileLoading) {
    return <LoadingScreen sx={{ minHeight: 240 }} />;
  }

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 3 }}>
        {(title || subheader) && (
          <CardHeader
            title={title}
            subheader={subheader}
            sx={{ p: 0, mb: 3 }}
            slotProps={{ title: { variant: 'h6' } }}
          />
        )}

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Every field below is optional — save whatever is available now, fill in the rest later.
        </Typography>

        <Box
          sx={{
            rowGap: 3,
            columnGap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Field.Text name="phone" label="Phone" />
          <Field.Text name="address" label="Address" />
          <Field.DatePicker name="dateOfBirth" label="Date of birth" />

          <Field.Select name="gender" label="Gender">
            <MenuItem value="">
              <em>Not set</em>
            </MenuItem>
            {EMPLOYEE_PROFILE_GENDER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Field.Select>

          <Field.Text name="emergencyContactName" label="Emergency contact name" />
          <Field.Text name="emergencyContactPhone" label="Emergency contact phone" />
          <Field.Text name="nationalId" label="National ID" />
          <Field.Text name="bankName" label="Bank name" />
          <Field.Text name="bankAccountNumber" label="Bank account number" />
        </Box>

        <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Save changes
          </Button>
        </Stack>
      </Card>
    </Form>
  );
}
