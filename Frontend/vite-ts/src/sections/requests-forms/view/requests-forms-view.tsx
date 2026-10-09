import type { ReactNode } from 'react';
import type { LetterType, LetterTemplateDto } from 'src/types/letter';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetLetterTemplates } from 'src/actions/letters';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type PaletteColor = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
type IconName = Parameters<typeof Iconify>[0]['icon'];

type Action = { label: string; href: string; primary?: boolean };

type ItemCardProps = {
  kind: 'Form' | 'Letter';
  title: string;
  description: string;
  icon: IconName;
  color: PaletteColor;
  flow: string[];
  actions?: Action[];
  children?: ReactNode;
};

function ItemCard({ kind, title, description, icon, color, flow, actions = [], children }: ItemCardProps) {
  return (
    <Card
      sx={{
        p: 3,
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        transition: (theme) => theme.transitions.create(['box-shadow', 'transform']),
        '&:hover': { boxShadow: (theme) => theme.vars.customShadows.z12, transform: 'translateY(-2px)' },
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: `${color}.main`,
            bgcolor: (theme) => varAlpha(theme.vars.palette[color].mainChannel, 0.12),
          }}
        >
          <Iconify icon={icon} width={28} />
        </Box>
        <Label variant="soft" color={kind === 'Letter' ? 'secondary' : 'info'}>
          {kind}
        </Label>
      </Stack>

      <Box>
        <Typography variant="h6" sx={{ mb: 0.75 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      </Box>

      {/* Who it goes through, in order */}
      <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 0.75 }}>
        {flow.map((step, index) => (
          <Stack key={step} direction="row" alignItems="center" sx={{ gap: 0.75 }}>
            {index > 0 && (
              <Iconify icon="eva:arrow-forward-fill" width={14} sx={{ color: 'text.disabled' }} />
            )}
            <Box
              component="span"
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 0.75,
                typography: 'caption',
                fontWeight: 'fontWeightSemiBold',
                bgcolor: 'background.neutral',
                color: 'text.secondary',
              }}
            >
              {step}
            </Box>
          </Stack>
        ))}
      </Stack>

      {children}

      {!!actions.length && (
        <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 1 }}>
          {actions.map((action) => (
            <Button
              key={action.label}
              component={RouterLink}
              href={action.href}
              size="small"
              variant={action.primary ? 'contained' : 'outlined'}
              color={action.primary ? 'inherit' : 'inherit'}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

type LetterRowProps = {
  label: string;
  template?: LetterTemplateDto;
  type: LetterType;
  canCreate: boolean;
  canEdit: boolean;
};

/** One letter template inside a letter card: its name plus Create letter / Edit template. */
function LetterTemplateRow({ label, template, type, canCreate, canEdit }: LetterRowProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      spacing={1}
      sx={{ py: 1 }}
    >
      <Box>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" sx={{ color: template ? 'text.secondary' : 'error.main' }}>
          {template
            ? `${template.fieldsSchema.filter((f) => !f.autoFilled).length} field(s) for HR · v${template.version}`
            : 'Template missing or hidden'}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        {canEdit && template && (
          <Button
            component={RouterLink}
            href={paths.dashboard.letterTemplates.edit(template.id)}
            size="small"
            color="inherit"
            startIcon={<Iconify icon="solar:pen-bold" width={16} />}
          >
            Edit
          </Button>
        )}
        {canCreate && (
          <Button
            component={RouterLink}
            href={`${paths.dashboard.letters.new}?letterType=${type}`}
            size="small"
            variant="contained"
            color="inherit"
            disabled={!template}
            startIcon={<Iconify icon="mingcute:add-line" width={16} />}
          >
            Create letter
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

/**
 * Requests & Forms — one place for every BNW HR form and letter. Forms (Leave, Complaint,
 * Attendance Regularization, Onboarding) are for everyone; letters (Appraisal outcome, Intern employment) are
 * shown to HR / CEO / ADMIN, with Create letter for HR / ADMIN and Edit template for ADMIN (same
 * permissions as the letter engine itself).
 */
export function RequestsFormsView() {
  const { user } = useAuthContext();
  const role = user?.role ?? '';
  const seesLetters = ['HR', 'CEO', 'ADMIN'].includes(role);
  const canCreateLetters = ['HR', 'ADMIN'].includes(role);
  const canEditTemplates = role === 'ADMIN';
  const seesAllForms = ['HR', 'ADMIN', 'CEO'].includes(role);

  const { templates } = useGetLetterTemplates({ isActive: true }, seesLetters);
  const templateOf = (type: LetterType) => templates.find((t) => t.type === type);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Requests & Forms"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Requests & Forms' }]}
        action={
          seesLetters && (
            <Button
              component={RouterLink}
              href={paths.dashboard.letterTemplates.root}
              variant="outlined"
              startIcon={<Iconify icon="solar:list-bold" />}
            >
              Manage letter templates
            </Button>
          )
        }
        sx={{ mb: 2 }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: { xs: 3, md: 5 } }}>
        Submit a request to HR, or prepare a letter for the CEO to sign. Every form and letter can
        be downloaded as a PDF laid out like the BNW paper original.
      </Typography>

      <Typography variant="overline" sx={{ display: 'block', mb: 2, color: 'text.disabled' }}>
        Forms
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ItemCard
            kind="Form"
            title="Leave / Holiday Application"
            description="Apply for annual, casual, sick or unpaid leave. See how many days you have left, and your holiday record."
            icon="solar:calendar-date-bold"
            color="primary"
            flow={['You', 'Your manager', 'HR']}
            actions={[
              { label: 'Apply for leave', href: paths.dashboard.leaveRequests.new, primary: true },
              { label: 'My leave & balance', href: paths.dashboard.leaveRequests.root },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ItemCard
            kind="Form"
            title="Complaint Form"
            description="Report a workplace issue, a faulty office accessory or a maintenance problem to the HR department."
            icon="solar:chat-round-dots-bold"
            color="warning"
            flow={['You', 'HR']}
            actions={[
              { label: 'New complaint', href: paths.dashboard.complaints.new, primary: true },
              {
                label: seesAllForms ? 'All complaints' : 'My complaints',
                href: paths.dashboard.complaints.root,
              },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ItemCard
            kind="Form"
            title="Attendance Regularization"
            description="Explain a late arrival or a missed thumb / hand / card punch so HR can regularize your attendance record."
            icon="solar:clock-circle-bold"
            color="info"
            flow={['You', 'Head of dept', 'HR']}
            actions={[
              {
                label: 'New form',
                href: paths.dashboard.attendanceRegularizations.new,
                primary: true,
              },
              { label: 'View forms', href: paths.dashboard.attendanceRegularizations.root },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ItemCard
            kind="Form"
            title="Employee Onboarding Form"
            description="Your personal, emergency contact, bank and medical details. Submitting it also updates your E-record."
            icon="solar:user-plus-bold"
            color="success"
            flow={['You', 'HR', 'E-record']}
            actions={[
              { label: 'My onboarding form', href: paths.dashboard.onboardingForms.mine, primary: true },
              ...(seesAllForms
                ? [{ label: 'All submissions', href: paths.dashboard.onboardingForms.root }]
                : []),
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ItemCard
            kind="Form"
            title="Reimbursement Claim"
            description="Get back money you spent for work — travel, fuel, client meals, courses. Attach the receipt and track it until it's paid."
            icon="solar:wad-of-money-bold"
            color="primary"
            flow={['You', 'Your manager', 'CEO (large amounts)', 'Payroll']}
            actions={[
              {
                label: 'New claim',
                href: `${paths.dashboard.workOrders.new}?type=REIMBURSEMENT`,
                primary: true,
              },
              { label: 'Work orders', href: paths.dashboard.workOrders.root },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ItemCard
            kind="Form"
            title="Equipment Request"
            description="Ask for a laptop, monitor, headset, chair, software licence or anything else you need to do your job."
            icon="solar:monitor-bold"
            color="secondary"
            flow={['You', 'Your manager', 'CEO (large amounts)', 'HR']}
            actions={[
              {
                label: 'Request equipment',
                href: `${paths.dashboard.workOrders.new}?type=EQUIPMENT`,
                primary: true,
              },
              { label: 'Work orders', href: paths.dashboard.workOrders.root },
            ]}
          />
        </Grid>
      </Grid>

      {seesLetters && (
        <>
          <Typography variant="overline" sx={{ display: 'block', mb: 2, color: 'text.disabled' }}>
            Letters — signed by the CEO
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <ItemCard
                kind="Letter"
                title="Appraisal Letter"
                description="Sent after the CEO's appraisal decision — an appreciation letter with the appraisal amount, or a review-outcome letter with feedback."
                icon="solar:cup-star-bold"
                color="primary"
                flow={['HR prepares', 'CEO signs', 'Employee']}
              >
                <Box>
                  <LetterTemplateRow
                    label="Accepted — Appreciation for Outstanding Performance"
                    type="APPRECIATION"
                    template={templateOf('APPRECIATION')}
                    canCreate={canCreateLetters}
                    canEdit={canEditTemplates}
                  />
                  <Divider sx={{ borderStyle: 'dashed' }} />
                  <LetterTemplateRow
                    label="Not approved — Appraisal Review Outcome"
                    type="APPRAISAL_REJECTION"
                    template={templateOf('APPRAISAL_REJECTION')}
                    canCreate={canCreateLetters}
                    canEdit={canEditTemplates}
                  />
                </Box>
              </ItemCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ItemCard
                kind="Letter"
                title="Employment Letter (Intern / Trainee)"
                description={`"To Whom It May Concern" confirmation of an intern's employment — name, CNIC, designation, join date and training period.`}
                icon="solar:letter-bold"
                color="secondary"
                flow={['HR prepares', 'CEO signs', 'Employee']}
              >
                <LetterTemplateRow
                  label="Employment Letter (Intern / Trainee)"
                  type="EMPLOYMENT_CONFIRMATION"
                  template={templateOf('EMPLOYMENT_CONFIRMATION')}
                  canCreate={canCreateLetters}
                  canEdit={canEditTemplates}
                />
              </ItemCard>
            </Grid>
          </Grid>
        </>
      )}
    </DashboardContent>
  );
}
