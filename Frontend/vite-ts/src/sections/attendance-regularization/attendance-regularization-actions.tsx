import type {
  AttendanceHrDecision,
  AttendanceRegularizationDto,
} from 'src/types/attendance-regularization';

import { useState } from 'react';

import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  submitHodRecommendation,
  submitAttendanceHrDecision,
} from 'src/actions/attendance-regularizations';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export const HR_DECISION_TEXT: Record<AttendanceHrDecision, string> = {
  TAKEN_ON_RECORD:
    'The regularization has been recommended by the designated authority and hence taken on record, also received in time.',
  NOT_IN_ORDER: 'The same is not in order. Hence put up to HOD, HRD (P).',
};

type Props = { form: AttendanceRegularizationDto };

/** "Recommendation of the Head of the Department" — for the employee's HOD while it's pending. */
export function HodRecommendationForm({ form }: Props) {
  const [remarks, setRemarks] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [saving, setSaving] = useState<'yes' | 'no' | null>(null);

  const submit = async (recommended: boolean) => {
    if (!signatureText.trim()) {
      toast.error('Type your full name to sign');
      return;
    }
    setSaving(recommended ? 'yes' : 'no');
    try {
      await submitHodRecommendation(form.id, { recommended, remarks, signatureText });
      toast.success(recommended ? 'Recommended and sent to HR!' : 'Marked as not recommended');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Typography variant="body2">
        I recommend aforesaid regularization of attendance of the employee concerned.
      </Typography>
      <TextField
        label="Remarks (optional)"
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Signature of HOD / Business Unit Head"
        placeholder="Type your full name to sign"
        value={signatureText}
        onChange={(event) => setSignatureText(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        fullWidth
      />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button
          variant="outlined"
          color="error"
          loading={saving === 'no'}
          disabled={!!saving}
          onClick={() => submit(false)}
        >
          Don&apos;t recommend
        </Button>
        <Button
          variant="contained"
          loading={saving === 'yes'}
          disabled={!!saving}
          onClick={() => submit(true)}
        >
          Recommend &amp; send to HR
        </Button>
      </Stack>
    </>
  );
}

/** "[For use by the HRD]" — HR / ADMIN once the HOD has acted (or with no HOD). */
export function AttendanceHrDecisionForm({ form }: Props) {
  const [decision, setDecision] = useState<AttendanceHrDecision>(
    form.status === 'HOD_NOT_RECOMMENDED' ? 'NOT_IN_ORDER' : 'TAKEN_ON_RECORD'
  );
  const [remarks, setRemarks] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!signatureText.trim()) {
      toast.error('Type your full name to sign');
      return;
    }
    setSaving(true);
    try {
      await submitAttendanceHrDecision(form.id, { decision, remarks, signatureText });
      toast.success('Recorded!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <RadioGroup
        value={decision}
        onChange={(event) => setDecision(event.target.value as AttendanceHrDecision)}
      >
        {(Object.keys(HR_DECISION_TEXT) as AttendanceHrDecision[]).map((option) => (
          <FormControlLabel
            key={option}
            value={option}
            control={<Radio />}
            label={HR_DECISION_TEXT[option]}
            sx={{ alignItems: 'flex-start', mb: 1, '& .MuiRadio-root': { pt: 0.25 } }}
          />
        ))}
      </RadioGroup>
      <TextField
        label="Remarks (optional)"
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Human Resource Department — name & signature"
        placeholder="Type your full name to sign"
        value={signatureText}
        onChange={(event) => setSignatureText(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 255 } }}
        fullWidth
      />
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" loading={saving} onClick={onSave}>
          Save
        </Button>
      </Stack>
    </>
  );
}
