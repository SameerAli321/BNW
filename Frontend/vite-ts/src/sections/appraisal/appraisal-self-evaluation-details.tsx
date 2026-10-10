import type { LabelColor } from 'src/components/label';
import type { AppraisalRating, SelfEvaluationForm } from 'src/types/appraisal';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { APPRAISAL_RATING_OPTIONS, SELF_EVALUATION_COMPETENCIES } from 'src/types/appraisal';

// ----------------------------------------------------------------------
// Read-only rendering of a submitted Self Evaluation Form on the appraisal detail page.

const RATING_COLOR: Record<AppraisalRating, LabelColor> = {
  GROWTH_SUPPORT_REQUIRED: 'error',
  DEVELOPING: 'warning',
  STRONG: 'info',
  EXCEPTIONAL: 'success',
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

const infoGrid = {
  gap: 2,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
} as const;

type Props = { form: SelfEvaluationForm };

export function AppraisalSelfEvaluationDetails({ form }: Props) {
  return (
    <Card>
      <CardHeader title="Self Evaluation Form" />

      <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Employee Details</Typography>
          <Box sx={infoGrid}>
            <InfoItem label="Employee Name" value={form.employee.name} />
            <InfoItem label="Job Title" value={form.employee.jobTitle} />
            <InfoItem label="Department" value={form.employee.department} />
            <InfoItem label="Location" value={form.employee.location} />
            <InfoItem label="Contact Number" value={form.employee.contactNumber} />
            <InfoItem label="Employee Email ID" value={form.employee.email} />
          </Box>
          <InfoItem label="Project Description" value={form.employee.projectDescription} />
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={infoGrid}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Line Manager Details</Typography>
            <InfoItem label="Line Manager Name" value={form.lineManager.name} />
            <InfoItem label="Designation" value={form.lineManager.designation} />
          </Stack>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Appraisal Duration</Typography>
            <InfoItem label="Appraisal Year" value={form.duration.appraisalYear} />
            <InfoItem
              label="Evaluation Period"
              value={`${fDate(form.duration.evaluationFrom)} – ${fDate(form.duration.evaluationTo)}`}
            />
          </Stack>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack spacing={2}>
          <Typography variant="subtitle2">Assess Yourself</Typography>
          {SELF_EVALUATION_COMPETENCIES.map((item) => {
            const answer = form.assessments.find((a) => a.competency === item.key);
            const rating = APPRAISAL_RATING_OPTIONS.find((o) => o.value === answer?.rating);
            return (
              <Box key={item.key} sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">{item.title}</Typography>
                  {answer && rating && (
                    <Label variant="soft" color={RATING_COLOR[answer.rating]}>
                      {rating.label}
                    </Label>
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {answer?.reason || '—'}
                </Typography>
              </Box>
            );
          })}
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <InfoItem label="Employee Summary Remarks" value={form.summaryRemarks} />
      </Stack>
    </Card>
  );
}
