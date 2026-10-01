import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { sendTestEmail, useGetMailStatus } from 'src/actions/interviews';

import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/**
 * Shows whether outgoing email (SMTP) is set up and connecting, and lets an Admin send a test
 * email. The settings themselves live in Backend/.env — never in the app or the database.
 */
export function MailSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthContext();
  const { mailStatus, mailStatusLoading, refreshMailStatus } = useGetMailStatus(open);
  const [to, setTo] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);

  const onTest = async () => {
    if (!/^\S+@\S+\.\S+$/.test(to.trim())) {
      toast.error('Enter an email address to send the test to');
      return;
    }
    setBusy(true);
    try {
      const result = await sendTestEmail(to.trim());
      if (result.status === 'SENT') toast.success(`Test email sent to ${to.trim()} — check the inbox (and spam).`);
      else if (result.status === 'FAILED') toast.error(`Sending failed: ${result.error}`);
      else toast.warning('Email is not set up yet — nothing was sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  };

  const renderStatus = () => {
    if (mailStatusLoading || !mailStatus) return <Alert severity="info">Checking the mail server…</Alert>;
    if (!mailStatus.configured) {
      return (
        <Alert severity="warning">
          Email is <strong>not set up</strong>. Fill in <code>SMTP_USER</code>, <code>SMTP_PASS</code>{' '}
          and <code>MAIL_FROM</code> in <code>Backend/.env</code>, then restart the backend. Until
          then, emails are only written to the backend console.
        </Alert>
      );
    }
    if (!mailStatus.connected) {
      return (
        <Alert severity="error">
          The settings are there, but the server couldn&apos;t log in to the mail server:{' '}
          <strong>{mailStatus.error}</strong>. Check the mailbox address and password in
          Backend/.env.
        </Alert>
      );
    }
    return (
      <Alert severity="success">
        Connected. Emails are sent as <strong>{mailStatus.from}</strong>.
      </Alert>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Email settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {renderStatus()}
          {user?.role === 'ADMIN' && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Send a test email</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Send to"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  fullWidth
                />
                <Button variant="contained" loading={busy} onClick={onTest} sx={{ flexShrink: 0 }}>
                  Send test
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => refreshMailStatus()}>
          Check again
        </Button>
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
