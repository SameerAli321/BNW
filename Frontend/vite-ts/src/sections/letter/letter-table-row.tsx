import type { LetterDto } from 'src/types/letter';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import {
  ceoSignLetter,
  downloadLetterPdf,
  submitLetterToCeo,
  employeeSignLetter,
  sendLetterToEmployee,
  requestLetterChanges,
} from 'src/actions/letters';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { LetterSignDialog } from './letter-sign-dialog';
import { LetterStatusLabel } from './letter-status-label';
import { LetterRequestChangesDialog } from './letter-request-changes-dialog';

// ----------------------------------------------------------------------
// Row-level actions gated by BOTH the caller's role AND the letter's current status, matching
// docs/API_CONTRACT_SPRINT3.md's endpoint table exactly (not just role) — see the detail page for
// the same gating logic applied to the full action set.

type Props = {
  row: LetterDto;
  detailsHref: string;
  currentRole: string;
  currentUserId?: number;
};

export function LetterTableRow({ row, detailsHref, currentRole, currentUserId }: Props) {
  const [busy, setBusy] = useState(false);
  const signDialog = useBoolean();
  const requestChangesDialog = useBoolean();

  const isHrAdmin = currentRole === 'HR' || currentRole === 'ADMIN';
  const isCeo = currentRole === 'CEO';
  const isSelfSubject = !!currentUserId && currentUserId === row.subjectUserId;

  const canSubmitToCeo = isHrAdmin && (row.status === 'DRAFT' || row.status === 'CHANGES_REQUESTED');
  const canCeoAct = isCeo && row.status === 'PENDING_CEO';
  const canSendToEmployee = isHrAdmin && row.status === 'CEO_SIGNED';
  const canEmployeeSign = isSelfSubject && row.status === 'SENT_TO_EMPLOYEE';

  const handleSubmitToCeo = useCallback(async () => {
    setBusy(true);
    try {
      await submitLetterToCeo(row.id);
      toast.success('Submitted to CEO!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Submit failed!');
    } finally {
      setBusy(false);
    }
  }, [row.id]);

  const handleSendToEmployee = useCallback(async () => {
    setBusy(true);
    try {
      await sendLetterToEmployee(row.id);
      toast.success('Sent to employee!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Send failed!');
    } finally {
      setBusy(false);
    }
  }, [row.id]);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    try {
      await downloadLetterPdf(row.id, `${row.type.toLowerCase()}-letter-${row.id}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Download failed!');
    } finally {
      setBusy(false);
    }
  }, [row.id, row.type]);

  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Link component={RouterLink} href={detailsHref} color="inherit" sx={{ cursor: 'pointer' }}>
          {row.subjectName}
        </Link>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.templateName}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.type}</TableCell>

      <TableCell>
        <LetterStatusLabel status={row.status} />
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.preparedByName}</TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.createdAt)}</TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {row.hasPdf && (
          <Tooltip title="Download PDF">
            <IconButton onClick={handleDownload} disabled={busy}>
              <Iconify icon="solar:download-bold" />
            </IconButton>
          </Tooltip>
        )}

        {canSubmitToCeo && (
          <Button size="small" variant="outlined" onClick={handleSubmitToCeo} disabled={busy}>
            Submit to CEO
          </Button>
        )}

        {canCeoAct && (
          <>
            <Button
              size="small"
              color="warning"
              variant="outlined"
              onClick={requestChangesDialog.onTrue}
              sx={{ ml: 1 }}
            >
              Request changes
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={signDialog.onTrue}
              sx={{ ml: 1 }}
            >
              Sign
            </Button>
          </>
        )}

        {canSendToEmployee && (
          <Button size="small" variant="outlined" onClick={handleSendToEmployee} disabled={busy}>
            Send to employee
          </Button>
        )}

        {canEmployeeSign && (
          <Button size="small" variant="contained" onClick={signDialog.onTrue}>
            Sign now
          </Button>
        )}

        <Tooltip title="View">
          <IconButton component={RouterLink} href={detailsHref}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>

      {canCeoAct && (
        <>
          <LetterSignDialog
            open={signDialog.value}
            onClose={signDialog.onFalse}
            title="Sign as CEO"
            description="This countersigns the letter and moves it to CEO signed."
            onConfirm={(signatureText) => ceoSignLetter(row.id, signatureText)}
          />
          <LetterRequestChangesDialog
            open={requestChangesDialog.value}
            onClose={requestChangesDialog.onFalse}
            onConfirm={(comment) => requestLetterChanges(row.id, comment)}
          />
        </>
      )}

      {canEmployeeSign && (
        <LetterSignDialog
          open={signDialog.value}
          onClose={signDialog.onFalse}
          title="Sign your letter"
          description="Typing your name below confirms you've read and accept this letter."
          onConfirm={(signatureText) =>
            employeeSignLetter(row.id, signatureText, row.subjectUserId)
          }
        />
      )}
    </TableRow>
  );
}
