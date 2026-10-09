import type { ComplaintDto, ComplaintStatus } from 'src/types/complaint';

import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { submitComplaintHrResponse } from 'src/actions/complaints';

import { toast } from 'src/components/snackbar';

import { HrFormField } from 'src/sections/hr-forms/hr-form-section';

import { COMPLAINT_STATUS_OPTIONS } from 'src/types/complaint';

import { COMPLAINT_STATUS_LABEL } from './complaint-status-label';

// ----------------------------------------------------------------------

type Props = { complaint: ComplaintDto };

/** Editable "Human Resource Department Only" section — HR / ADMIN only. */
export function ComplaintHrResponseForm({ complaint }: Props) {
  const [comments, setComments] = useState(complaint.hrComments ?? '');
  const [actionRequested, setActionRequested] = useState(complaint.hrActionRequested ?? '');
  const [acknowledgement, setAcknowledgement] = useState(complaint.hrAcknowledgement ?? '');
  const [status, setStatus] = useState<ComplaintStatus>(
    complaint.status === 'SUBMITTED' ? 'IN_PROGRESS' : complaint.status
  );
  const [signatureText, setSignatureText] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      await submitComplaintHrResponse(complaint.id, {
        comments,
        actionRequested,
        acknowledgement,
        status,
        ...(signatureText.trim() ? { signatureText } : {}),
      });
      setSignatureText('');
      toast.success('HR response saved!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TextField
        label="Comments"
        value={comments}
        onChange={(event) => setComments(event.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Action requested"
        value={actionRequested}
        onChange={(event) => setActionRequested(event.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Acknowledgement / receiving"
        value={acknowledgement}
        onChange={(event) => setAcknowledgement(event.target.value)}
        fullWidth
      />

      {complaint.hrSignatureText && (
        <HrFormField
          label="Representative signature"
          value={`${complaint.hrSignatureText} (${complaint.hrRepresentativeName ?? ''}${
            complaint.hrSignedAt ? `, ${new Date(complaint.hrSignedAt).toLocaleDateString()}` : ''
          })`}
        />
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={complaint.hrSignatureText ? 'Re-sign (optional)' : 'Representative signature'}
          placeholder="Type your full name to sign"
          value={signatureText}
          onChange={(event) => setSignatureText(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 255 } }}
          fullWidth
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ComplaintStatus)}
          sx={{ minWidth: { sm: 200 } }}
        >
          {COMPLAINT_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {COMPLAINT_STATUS_LABEL[option]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" loading={saving} onClick={onSave}>
          Save HR response
        </Button>
      </Stack>
    </>
  );
}
