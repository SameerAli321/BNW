import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fDateTime } from 'src/utils/format-time';

import { remindPolicy, POLICY_REMINDER_ROLES, useGetPolicyAcknowledgements } from 'src/actions/about';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

type Show = 'all' | 'signed' | 'pending';

type Props = { role: string };

/**
 * Who has signed the current handbook version — everyone for CEO / HR / Admin, a Team Lead's
 * direct reports for them. HR / Admin can remind the people still pending (bell + email).
 */
export function PolicyAcknowledgementsTable({ role }: Props) {
  const { rows, summary, version, rowsLoading } = useGetPolicyAcknowledgements(true);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [confirmRemind, setConfirmRemind] = useState(false);
  const [reminding, setReminding] = useState(false);
  const canRemind = POLICY_REMINDER_ROLES.includes(role);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (show === 'all' || (show === 'signed') === !!row.acknowledgedAt) &&
        (!term ||
          [row.name, row.employeeCode, row.designation, row.department, row.managerName]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term)))
    );
  }, [rows, search, show]);

  const handleRemind = async () => {
    setReminding(true);
    try {
      const reminded = await remindPolicy();
      toast.success(
        reminded ? `Reminder sent to ${reminded} ${reminded === 1 ? 'person' : 'people'}` : 'Everyone has signed'
      );
      setConfirmRemind(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the reminders');
    } finally {
      setReminding(false);
    }
  };

  const percent = summary?.total ? Math.round((summary.acknowledged / summary.total) * 100) : 0;

  return (
    <Card>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6">Acknowledgements</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Handbook version {version ?? '—'} · {summary?.acknowledged ?? 0} of{' '}
              {summary?.total ?? 0} signed ({percent}%)
            </Typography>
          </Box>
          {canRemind && (
            <Button
              variant="contained"
              disabled={!summary?.pending}
              onClick={() => setConfirmRemind(true)}
              startIcon={<Iconify icon="solar:bell-bing-bold" />}
            >
              Remind {summary?.pending ?? 0} pending
            </Button>
          )}
        </Stack>

        <LinearProgress
          variant="determinate"
          value={percent}
          color={percent === 100 ? 'success' : 'primary'}
          sx={{ mt: 2, height: 6, borderRadius: 3 }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, department or manager…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={show}
            onChange={(_, next: Show | null) => next && setShow(next)}
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="all">All {summary?.total ?? 0}</ToggleButton>
            <ToggleButton value="signed">Signed {summary?.acknowledged ?? 0}</ToggleButton>
            <ToggleButton value="pending">Pending {summary?.pending ?? 0}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <Scrollbar>
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Manager</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Signed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rowsLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            )}
            {!rowsLoading && !shown.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyContent title="Nobody matches" sx={{ py: 5 }} />
                </TableCell>
              </TableRow>
            )}
            {shown.map((row) => (
              <TableRow key={row.userId} hover>
                <TableCell>
                  <Typography variant="subtitle2">{row.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {[row.employeeCode, row.designation].filter(Boolean).join(' · ') || '—'}
                  </Typography>
                </TableCell>
                <TableCell>{row.department ?? '—'}</TableCell>
                <TableCell>{row.managerName ?? '—'}</TableCell>
                <TableCell>
                  <Label color={row.acknowledgedAt ? 'success' : 'warning'}>
                    {row.acknowledgedAt ? 'Signed' : 'Pending'}
                  </Label>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {row.acknowledgedAt ? (
                    <>
                      <Typography variant="body2">{fDateTime(row.acknowledgedAt)}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        Signed as “{row.signatureText}”
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Scrollbar>

      <ConfirmDialog
        open={confirmRemind}
        onClose={() => setConfirmRemind(false)}
        title="Send reminders?"
        content={`Everyone who hasn't signed yet (${summary?.pending ?? 0}) gets a notification and an email asking them to read and acknowledge the handbook.`}
        action={
          <Button variant="contained" loading={reminding} onClick={handleRemind}>
            Send reminders
          </Button>
        }
      />
    </Card>
  );
}
