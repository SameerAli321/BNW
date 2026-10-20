import type { ComplaintDto, CreateComplaintDto } from 'src/types/complaint';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { createComplaint, updateComplaint } from 'src/actions/complaints';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { HrFormSection } from 'src/sections/hr-forms/hr-form-section';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type FormState = Required<CreateComplaintDto>;

const EMPTY: FormState = {
  contactNumber: '',
  description: '',
  accessoryType: '',
  accessoryDescription: '',
  accessoryIssue: '',
  maintenanceArea: '',
  maintenanceDescription: '',
};

type Props = {
  // Editing an existing complaint (until HR responds) instead of raising a new one.
  current?: ComplaintDto;
};

/**
 * The digital Complaint Form — same sections as BNW's paper form. Name, department, email and date
 * come from the logged-in user (or the complaint, when editing); the "Human Resource Department
 * Only" section is filled in by HR afterwards on the complaint's detail page.
 */
export function ComplaintCreateView({ current }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [form, setForm] = useState<FormState>(() =>
    current
      ? {
          contactNumber: current.contactNumber ?? '',
          description: current.description ?? '',
          accessoryType: current.accessoryType ?? '',
          accessoryDescription: current.accessoryDescription ?? '',
          accessoryIssue: current.accessoryIssue ?? '',
          maintenanceArea: current.maintenanceArea ?? '',
          maintenanceDescription: current.maintenanceDescription ?? '',
        }
      : EMPTY
  );
  const [submitting, setSubmitting] = useState(false);

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value })),
    fullWidth: true,
  });

  const hasContent = Object.entries(form).some(
    ([key, value]) => key !== 'contactNumber' && value.trim()
  );

  const onSubmit = async () => {
    if (!hasContent) {
      toast.error('Fill in at least one section: complaint details, office accessories or maintenance issue');
      return;
    }
    setSubmitting(true);
    try {
      const saved = current ? await updateComplaint(current.id, form) : await createComplaint(form);
      toast.success(current ? 'Complaint updated — HR has been told' : 'Complaint submitted to HR!');
      router.push(paths.dashboard.complaints.details(saved.id));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Submit failed!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading={current ? `Edit complaint #${current.id}` : 'Complaint form'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms', href: paths.dashboard.requestsForms },
          { name: 'Complaints', href: paths.dashboard.complaints.root },
          ...(current
            ? [
                { name: `#${current.id}`, href: paths.dashboard.complaints.details(current.id) },
                { name: 'Edit' },
              ]
            : [{ name: 'New' }]),
        ]}
        sx={{ mb: 3 }}
      />

      <Box component="ul" sx={{ pl: 2.5, mb: 3, typography: 'body2', color: 'text.secondary' }}>
        <li>Fill in whichever sections apply — at least one of complaint details, office accessories or maintenance issue.</li>
        <li>Provide as much detail as possible to help resolve the issue promptly.</li>
        <li>The completed form goes to the HR department; you can download a copy for your records afterwards.</li>
      </Box>

      <Stack spacing={3}>
        <HrFormSection title="Employee Information">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Name"
                value={
                  current ? current.complainantName : user ? `${user.firstName} ${user.lastName}` : ''
                }
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Department"
                value={(current ? current.complainantDepartment : user?.departmentName) ?? '—'}
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Contact number"
                placeholder="Leave blank to use the phone on your E-record"
                slotProps={{ htmlInput: { maxLength: 30 } }}
                {...field('contactNumber')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Email"
                value={current ? current.complainantEmail : (user?.email ?? '')}
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Date"
                value={fDate(current ? current.createdAt : new Date())}
                fullWidth
                disabled
              />
            </Grid>
          </Grid>
        </HrFormSection>

        <HrFormSection title="Complaint Details">
          <TextField label="Description of complaint" multiline minRows={4} {...field('description')} />
        </HrFormSection>

        <HrFormSection title="Office Accessories">
          <TextField
            label="Accessory type"
            placeholder="e.g. Laptop, keyboard, chair"
            slotProps={{ htmlInput: { maxLength: 150 } }}
            {...field('accessoryType')}
          />
          <TextField label="Description" multiline minRows={2} {...field('accessoryDescription')} />
          <TextField label="Issue" multiline minRows={2} {...field('accessoryIssue')} />
        </HrFormSection>

        <HrFormSection title="Maintenance Issue">
          <TextField
            label="Area / equipment"
            placeholder="e.g. Meeting room AC, 2nd floor washroom"
            slotProps={{ htmlInput: { maxLength: 150 } }}
            {...field('maintenanceArea')}
          />
          <TextField
            label="Description of issue"
            multiline
            minRows={3}
            {...field('maintenanceDescription')}
          />
        </HrFormSection>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          The &quot;Human Resource Department Only&quot; section is completed by HR after you submit.
        </Typography>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button
            component={RouterLink}
            href={
              current
                ? paths.dashboard.complaints.details(current.id)
                : paths.dashboard.complaints.root
            }
            variant="outlined"
          >
            Cancel
          </Button>
          <Button variant="contained" loading={submitting} onClick={onSubmit}>
            {current ? 'Save changes' : 'Submit to HR'}
          </Button>
        </Stack>
      </Stack>
    </DashboardContent>
  );
}
