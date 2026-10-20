import type { CandidateDto } from 'src/types/candidate';

import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { useGetLetters } from 'src/actions/letters';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { LetterStatusLabel } from '../letter/letter-status-label';

// ----------------------------------------------------------------------
// Letters / contracts HR prepared for a candidate (`GET /letters?candidateId=`), including ones
// that have since moved onto the candidate's new employee account.

type Props = {
  open: boolean;
  onClose: () => void;
  candidate: CandidateDto;
};

export function CandidateLettersDialog({ open, onClose, candidate }: Props) {
  const smDown = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const { letters, lettersLoading } = useGetLetters({ candidateId: candidate.id, limit: 50 }, open);

  const isHired = candidate.status === 'HIRED';
  const newLetterHref = `${paths.dashboard.letters.new}?candidateId=${candidate.id}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={smDown}>
      <DialogTitle>Letters for {candidate.name}</DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {lettersLoading && (
          <Stack sx={{ py: 5, alignItems: 'center' }}>
            <CircularProgress size={28} />
          </Stack>
        )}

        {!lettersLoading && !letters.length && (
          <EmptyContent title="No letters yet" sx={{ py: 5 }} />
        )}

        <Stack spacing={1.5} divider={<Stack sx={{ borderTop: 1, borderColor: 'divider' }} />}>
          {letters.map((letter) => (
            <Stack
              key={letter.id}
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
            >
              <Stack sx={{ minWidth: 0 }}>
                <Link
                  component={RouterLink}
                  href={paths.dashboard.letters.details(letter.id)}
                  variant="subtitle2"
                >
                  {letter.templateName}
                </Link>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {fDate(letter.createdAt)} · prepared by {letter.preparedByName}
                  {!letter.isCandidate && ' · on employee account'}
                </Typography>
              </Stack>
              <LetterStatusLabel status={letter.status} />
            </Stack>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        {!isHired && (
          <Button
            component={RouterLink}
            href={newLetterHref}
            variant="outlined"
            startIcon={<Iconify icon="solar:letter-bold" />}
          >
            Prepare letter / contract
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
