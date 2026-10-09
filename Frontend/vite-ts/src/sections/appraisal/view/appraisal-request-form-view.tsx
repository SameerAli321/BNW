import type { AppraisalRating, CreateAppraisalRequestDto } from 'src/types/appraisal';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  useGetMyAppraisals,
  createAppraisalRequest,
  useGetAppraisalFormDefaults,
} from 'src/actions/appraisals';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { APPRAISAL_RATING_OPTIONS, SELF_EVALUATION_COMPETENCIES } from 'src/types/appraisal';

// ----------------------------------------------------------------------
// BNW "Self Evaluation Form" — POST /appraisal-requests `{ form }`. Sections and wording follow
// the original Microsoft Forms version (Employee Details → Line Manager Details → Appraisal
// Duration → Assess Yourself → Employee Summary Remarks). Every field is required.

const required = (label: string) =>
  zod
    .string()
    .trim()
    .min(1, { message: `${label} is required.` });

const RATING_VALUES = APPRAISAL_RATING_OPTIONS.map((option) => option.value) as [
  AppraisalRating,
  ...AppraisalRating[],
];

export const SelfEvaluationSchema = zod
  .object({
    employee: zod.object({
      location: required('Location'),
      projectDescription: required('Project description'),
      name: required('Employee name'),
      jobTitle: required('Job title'),
      contactNumber: required('Contact number'),
      email: required('Email').email({ message: 'Enter a valid email address.' }),
      department: required('Department'),
    }),
    lineManager: zod.object({
      name: required('Line manager name'),
      designation: required('Designation'),
    }),
    duration: zod.object({
      appraisalYear: required('Appraisal year'),
      evaluationFrom: required('Evaluation date (from)'),
      evaluationTo: required('Evaluation date (to)'),
    }),
    assessments: zod.array(
      zod.object({
        competency: zod.string(),
        // '' until the employee picks one — the refine turns that into a readable error.
        rating: zod.string().refine((value) => RATING_VALUES.includes(value as AppraisalRating), {
          message: 'Select an option.',
        }),
        reason: required('A reason'),
      })
    ),
    summaryRemarks: required('Employee summary remarks'),
  })
  .refine(
    (data) =>
      !data.duration.evaluationFrom ||
      !data.duration.evaluationTo ||
      !dayjs(data.duration.evaluationTo).isBefore(dayjs(data.duration.evaluationFrom), 'day'),
    { message: 'Must be on or after the "from" date.', path: ['duration', 'evaluationTo'] }
  );

export type SelfEvaluationSchemaType = zod.infer<typeof SelfEvaluationSchema>;

const EMPTY_FORM: SelfEvaluationSchemaType = {
  employee: {
    location: '',
    projectDescription: '',
    name: '',
    jobTitle: '',
    contactNumber: '',
    email: '',
    department: '',
  },
  lineManager: { name: '', designation: '' },
  duration: {
    appraisalYear: String(new Date().getFullYear()),
    evaluationFrom: '',
    evaluationTo: '',
  },
  assessments: SELF_EVALUATION_COMPETENCIES.map((item) => ({
    competency: item.key,
    rating: '',
    reason: '',
  })),
  summaryRemarks: '',
};

// ----------------------------------------------------------------------

export function AppraisalRequestFormView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { formDefaults } = useGetAppraisalFormDefaults();
  const { appraisalsMeta } = useGetMyAppraisals();

  const isCeo = user?.role === 'CEO';
  const canRequestNext = appraisalsMeta?.canRequestNext ?? true;
  const nextEligibleDate = appraisalsMeta?.nextEligibleDate;
  const blocked = isCeo || !canRequestNext;

  const methods = useForm<SelfEvaluationSchemaType>({
    resolver: zodResolver(SelfEvaluationSchema),
    defaultValues: EMPTY_FORM,
  });

  const {
    getValues,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // Pre-fill from the employee's own records once they load — only fields still empty, so a slow
  // response never overwrites something the employee already typed.
  useEffect(() => {
    if (!formDefaults) return;
    const fill = (name: Parameters<typeof setValue>[0], value: string) => {
      if (value && !getValues(name)) setValue(name, value);
    };
    fill('employee.name', formDefaults.employee.name);
    fill('employee.jobTitle', formDefaults.employee.jobTitle);
    fill('employee.contactNumber', formDefaults.employee.contactNumber);
    fill('employee.email', formDefaults.employee.email);
    fill('employee.department', formDefaults.employee.department);
    fill('lineManager.name', formDefaults.lineManager.name);
    fill('lineManager.designation', formDefaults.lineManager.designation);
  }, [formDefaults, getValues, setValue]);

  const submitForm = async (data: SelfEvaluationSchemaType) => {
    const payload: CreateAppraisalRequestDto = {
      form: {
        ...data,
        duration: {
          appraisalYear: data.duration.appraisalYear,
          evaluationFrom: dayjs(data.duration.evaluationFrom).format('YYYY-MM-DD'),
          evaluationTo: dayjs(data.duration.evaluationTo).format('YYYY-MM-DD'),
        },
        assessments: data.assessments.map((a) => ({
          competency:
            a.competency as CreateAppraisalRequestDto['form']['assessments'][number]['competency'],
          rating: a.rating as AppraisalRating,
          reason: a.reason,
        })),
      },
    };

    try {
      const created = await createAppraisalRequest(payload);
      toast.success('Self evaluation submitted!');
      router.push(paths.dashboard.appraisals.details(created.id));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Submission failed!');
    }
  };

  const onSubmit = handleSubmit(submitForm, () =>
    toast.error('Some answers are missing — check the fields marked in red.')
  );

  const sectionGrid = {
    p: 3,
    gap: 3,
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
  } as const;

  return (
    <DashboardContent maxWidth="lg">
      <CustomBreadcrumbs
        heading="Self Evaluation Form"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Appraisals', href: paths.dashboard.appraisals.root },
          { name: 'Request appraisal' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {isCeo && (
        <Alert severity="info" sx={{ mb: 3 }}>
          The CEO doesn&apos;t submit an appraisal request.
        </Alert>
      )}

      {!isCeo && !canRequestNext && nextEligibleDate && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You can request your next appraisal on {new Date(nextEligibleDate).toLocaleDateString()}{' '}
          (once every 3 months).
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={3}>
          <Card>
            <CardHeader
              title="Employee Details"
              subheader="Pre-filled from your profile where possible — please check and complete."
            />
            <Box sx={sectionGrid}>
              <Field.Text name="employee.location" label="1. Location" />
              <Field.Text name="employee.name" label="3. Employee Name" />
              <Field.Text
                name="employee.projectDescription"
                label="2. Project Description"
                multiline
                minRows={2}
                sx={{ gridColumn: { md: 'span 2' } }}
              />
              <Field.Text name="employee.jobTitle" label="4. Job Title" />
              <Field.Text name="employee.contactNumber" label="5. Contact Number" />
              <Field.Text name="employee.email" label="6. Employee Email ID" />
              <Field.Text name="employee.department" label="7. Department" />
            </Box>
          </Card>

          <Card>
            <CardHeader title="Line Manager Details" />
            <Box sx={sectionGrid}>
              <Field.Text name="lineManager.name" label="8. Line Manager Name" />
              <Field.Text name="lineManager.designation" label="9. Designation" />
            </Box>
          </Card>

          <Card>
            <CardHeader title="Appraisal Duration" />
            <Box
              sx={{
                ...sectionGrid,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              }}
            >
              <Field.Text name="duration.appraisalYear" label="10. Appraisal Year" />
              <Field.DatePicker name="duration.evaluationFrom" label="11. Evaluation Date (from)" />
              <Field.DatePicker name="duration.evaluationTo" label="12. Evaluation Date (to)" />
            </Box>
          </Card>

          <Card>
            <CardHeader
              title="Assess Yourself"
              subheader="Rate yourself on each area and give the reason for your choice."
            />
            <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} sx={{ px: 3, pb: 1 }}>
              {SELF_EVALUATION_COMPETENCIES.map((item, index) => {
                const questionNo = 13 + index * 2;
                return (
                  <Stack key={item.key} spacing={2} sx={{ py: 3 }}>
                    <Box>
                      <Typography variant="subtitle1">
                        {questionNo}. {item.title}
                      </Typography>
                      {item.description && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {item.description}
                        </Typography>
                      )}
                    </Box>

                    <Field.RadioGroup
                      row
                      name={`assessments.${index}.rating`}
                      options={APPRAISAL_RATING_OPTIONS}
                      sx={{ columnGap: 3 }}
                    />

                    <Field.Text
                      name={`assessments.${index}.reason`}
                      label={`${questionNo + 1}. Reasons for Selecting this Option`}
                      multiline
                      minRows={2}
                    />
                  </Stack>
                );
              })}
            </Stack>
          </Card>

          <Card>
            <CardHeader title="33. Employee Summary Remarks" />
            <Stack spacing={2} sx={{ p: 3 }}>
              <Alert severity="info" variant="outlined">
                Please explain your experience for the appraisal period, what you achieved, learned
                and also mention the mistakes you made or areas you believe you require development
                on and how we can support your development needs.
              </Alert>
              <Field.Text
                name="summaryRemarks"
                label="Employee Summary Remarks"
                multiline
                minRows={5}
              />
            </Stack>
          </Card>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              component={RouterLink}
              href={paths.dashboard.appraisals.root}
              color="inherit"
              variant="outlined"
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" loading={isSubmitting} disabled={blocked}>
              Submit self evaluation
            </Button>
          </Stack>
        </Stack>
      </Form>
    </DashboardContent>
  );
}
