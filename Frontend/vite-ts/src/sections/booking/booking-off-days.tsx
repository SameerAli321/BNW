import type { OffDay } from 'src/actions/bookings';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';

import { createOffDay, deleteOffDay, useGetOffDays } from 'src/actions/bookings';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { pktToday } from './booking-utils';

// ----------------------------------------------------------------------

/**
 * Office off days (HR / Admin), on the Rooms & tables page. Each one shows as a holiday on everyone's
 * calendar (bookings on it are still allowed) and leave doesn't use a day for it.
 * Only today and later are listed.
 */
export function BookingOffDays() {
  const today = pktToday();
  const { offDays, offDaysLoading } = useGetOffDays({ from: today });
  const [draft, setDraft] = useState<{ date: string; reason: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<OffDay | null>(null);

  const save = async () => {
    if (!draft) return;
    if (!draft.date || draft.reason.trim().length < 2) {
      toast.error('Pick a date and say why the office is off');
      return;
    }
    setSaving(true);
    try {
      await createOffDay({ date: draft.date, reason: draft.reason.trim() });
      toast.success('Off day added — it now shows as a holiday on the calendar');
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add the off day');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await deleteOffDay(removing.id);
      toast.success('Off day removed — bookings are allowed on that day again');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the off day');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <Card sx={{ mt: 3 }}>
        <CardHeader
          title="Office off days"
          subheader="Public holidays and closures. They show as holidays on everyone's calendar, and leave doesn't use a day for them. Bookings are still allowed."
          action={
            <Button
              variant="outlined"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setDraft({ date: '', reason: '' })}
            >
              Add off day
            </Button>
          }
          sx={{ mb: 2 }}
        />
        <TableContainer>
          <Scrollbar>
            <Table sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Added by</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!offDaysLoading && !offDays.length ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ color: 'text.secondary', py: 3 }}>
                      No upcoming off days.
                    </TableCell>
                  </TableRow>
                ) : (
                  offDays.map((day) => (
                    <TableRow key={day.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {fDate(day.date, 'ddd DD MMM YYYY')}
                      </TableCell>
                      <TableCell>{day.reason}</TableCell>
                      <TableCell>{day.createdBy ?? '—'}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                          onClick={() => setRemoving(day)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>
      </Card>

      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="xs">
        <DialogTitle>Add office off day</DialogTitle>
        {draft && (
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                autoFocus
                type="date"
                label="Date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
              />
              <TextField
                label="Reason"
                value={draft.reason}
                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                placeholder="e.g. Eid holiday"
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              <Alert severity="info">
                It shows as a holiday on everyone&apos;s calendar. Bookings already on this day are
                kept.
              </Alert>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button color="inherit" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          <Button variant="contained" loading={saving} onClick={save}>
            Add off day
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this off day?"
        content={
          removing
            ? `${fDate(removing.date, 'ddd DD MMM YYYY')} (${removing.reason}) becomes a normal working day.`
            : ''
        }
        action={
          <Button variant="contained" color="error" onClick={remove}>
            Remove
          </Button>
        }
      />
    </>
  );
}
