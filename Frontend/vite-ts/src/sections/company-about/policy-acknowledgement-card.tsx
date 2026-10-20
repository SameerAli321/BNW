import type { MyPolicyAcknowledgement } from 'src/actions/about';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { acknowledgePolicy } from 'src/actions/about';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { POLICY_HANDBOOK_TITLE } from './policy-handbook-content';

// ----------------------------------------------------------------------

/** Same comparison the backend makes: case and extra spaces don't matter. */
const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

type Props = {
  ack: MyPolicyAcknowledgement | undefined;
  /** The signer's own name — the typed signature must match it. */
  fullName: string;
  sectionsRead: number;
  sectionsTotal: number;
};

/**
 * End of the handbook: the employee confirms they've read it and signs by typing their full name.
 * It's then sent to their manager and HR (bell + email). Once signed, shows the signed receipt.
 */
export function PolicyAcknowledgementCard({ ack, fullName, sectionsRead, sectionsTotal }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [saving, setSaving] = useState(false);

  const nameMatches = !!signature.trim() && normalise(signature) === normalise(fullName);
  const readAll = sectionsRead >= sectionsTotal;

  const handleSign = async () => {
    setSaving(true);
    try {
      const saved = await acknowledgePolicy(signature.trim());
      toast.success(
        saved.sentTo.length
          ? `Thank you — your acknowledgement was sent to ${saved.sentTo.join(', ')}`
          : 'Thank you — your acknowledgement was saved'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your acknowledgement');
    } finally {
      setSaving(false);
    }
  };

  if (ack?.acknowledged) {
    return (
      <Card
        id="policy-acknowledgement"
        sx={(theme) => ({
          p: { xs: 2.5, md: 3 },
          border: `1px solid ${varAlpha(theme.vars.palette.success.mainChannel, 0.32)}`,
          bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.06),
        })}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'success.contrastText',
              bgcolor: 'success.main',
            }}
          >
            <Iconify icon="solar:verified-check-bold" width={30} />
          </Box>
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography variant="h6">You have acknowledged this handbook</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Signed on {ack.acknowledgedAt ? fDateTime(ack.acknowledgedAt) : '—'} · version{' '}
              {ack.version}
              {ack.sentTo.length ? ` · sent to ${ack.sentTo.join(', ')}` : ''}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { sm: 'right' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Signature
            </Typography>
            <Typography
              sx={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive', fontSize: 26, lineHeight: 1.2 }}
            >
              {ack.signatureText}
            </Typography>
          </Box>
        </Stack>
      </Card>
    );
  }

  return (
    <Card
      id="policy-acknowledgement"
      sx={(theme) => ({
        p: { xs: 2.5, md: 3 },
        border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.32)}`,
      })}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Iconify icon="solar:pen-bold" width={26} sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h6">Acknowledgement & signature</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your signed acknowledgement is sent to{' '}
              {ack?.recipients.length ? ack.recipients.join(' and ') : 'HR'}.
            </Typography>
          </Box>
        </Stack>

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Sections read
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {sectionsRead} of {sectionsTotal}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={sectionsTotal ? (sectionsRead / sectionsTotal) * 100 : 0}
            color={readAll ? 'success' : 'primary'}
            sx={{ height: 6, borderRadius: 3 }}
          />
          {!readAll && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
              Scroll through every section (or open it from the contents) before you sign.
            </Typography>
          )}
        </Box>

        <FormControlLabel
          control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
          label={`I confirm that I have read and understood the ${POLICY_HANDBOOK_TITLE} and agree to follow the policies in it. I will ask HR if anything is unclear.`}
          sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { mt: -0.75 } }}
        />

        <Box
          sx={{
            gap: 2,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          <TextField
            label="Type your full name to sign"
            placeholder={fullName}
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            disabled={!agreed}
            error={!!signature.trim() && !nameMatches}
            helperText={
              signature.trim() && !nameMatches
                ? `Type your name exactly as "${fullName}"`
                : 'Your typed name is your signature'
            }
          />
          <Box
            sx={(theme) => ({
              px: 2,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 1.5,
              border: `1px dashed ${theme.vars.palette.divider}`,
              bgcolor: 'background.neutral',
            })}
          >
            <Typography
              sx={{
                fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                fontSize: 30,
                color: nameMatches ? 'text.primary' : 'text.disabled',
              }}
              noWrap
            >
              {signature.trim() || 'Your signature'}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" justifyContent="flex-end">
          <Button
            size="large"
            variant="contained"
            loading={saving}
            disabled={!agreed || !nameMatches || !readAll}
            onClick={handleSign}
            startIcon={<Iconify icon="solar:verified-check-bold" />}
          >
            Sign & send acknowledgement
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
