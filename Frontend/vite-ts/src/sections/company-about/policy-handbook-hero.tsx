import type { IconifyName } from 'src/components/iconify';

import { m, useReducedMotion } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { AnimatedAboutHeading, AnimatedAboutBackdrop } from './animated-about-heading';

// ----------------------------------------------------------------------

/** Little topic icons floating around the progress ring. */
const FLOATERS: { icon: IconifyName; top: string; left: string; delay: number }[] = [
  { icon: 'solar:clock-circle-bold', top: '2%', left: '8%', delay: 0 },
  { icon: 'solar:calendar-date-bold', top: '10%', left: '82%', delay: 0.6 },
  { icon: 'solar:shield-keyhole-bold-duotone', top: '74%', left: '0%', delay: 1.2 },
  { icon: 'solar:cup-star-bold', top: '80%', left: '84%', delay: 1.8 },
  { icon: 'solar:heart-bold', top: '42%', left: '96%', delay: 2.4 },
];

const RING = 148;
const STROKE = 10;

function ProgressRing({ readCount, total, signed }: { readCount: number; total: number; signed: boolean }) {
  const reduceMotion = useReducedMotion();
  const radius = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = signed ? 1 : total ? readCount / total : 0;

  return (
    <Box sx={{ position: 'relative', width: RING, height: RING }}>
      <svg width={RING} height={RING} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={RING / 2} cy={RING / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={STROKE} />
        <m.circle
          cx={RING / 2}
          cy={RING / 2}
          r={radius}
          fill="none"
          stroke="#fff"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduceMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
        />
      </svg>
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ position: 'absolute', inset: 0, textAlign: 'center' }}
      >
        {signed ? (
          <>
            <Iconify icon="solar:verified-check-bold" width={44} />
            <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
              All done
            </Typography>
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
              {readCount}
              <Box component="span" sx={{ fontSize: 18, opacity: 0.7 }}>
                /{total}
              </Box>
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, mt: 0.5 }}>
              topics read
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  firstName: string;
  readCount: number;
  total: number;
  minutes: number;
  parts: number;
  signed: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onStart: () => void;
  onSign: () => void;
};

/**
 * The About us banner: a personal welcome, what the handbook holds (topics, reading time, parts),
 * one clear next step, and a progress ring that fills as topics are read, then turns to a tick once signed.
 */
export function PolicyHandbookHero({
  firstName,
  readCount,
  total,
  minutes,
  parts,
  signed,
  canEdit,
  onEdit,
  onStart,
  onSign,
}: Props) {
  const reduceMotion = useReducedMotion();
  const readAll = readCount >= total;

  const status = signed
    ? "You've read and signed the handbook. Come back any time you need a reminder."
    : readAll
      ? 'You have read every topic. One last step: sign to confirm.'
      : readCount
        ? `Great progress! ${total - readCount} topic${total - readCount === 1 ? '' : 's'} to go.`
        : 'Start with the essentials below, then read the topics at your own pace.';

  const stats: { icon: IconifyName; label: string }[] = [
    { icon: 'solar:notebook-bold-duotone', label: `${total} short topics` },
    { icon: 'solar:clock-circle-bold', label: `About ${minutes} min read` },
    { icon: 'solar:list-bold', label: `${parts} easy parts` },
  ];

  return (
    <Card
      sx={(theme) => ({
        mb: 3,
        p: { xs: 3, md: 5 },
        color: 'common.white',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${theme.vars.palette.primary.dark} 0%, ${theme.vars.palette.primary.main} 60%, ${theme.vars.palette.success.main} 140%)`,
        // Faint dot pattern for texture.
        '&::before': {
          content: '""',
          inset: 0,
          position: 'absolute',
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'linear-gradient(90deg, transparent 0%, #000 70%)',
        },
      })}
    >
      <AnimatedAboutBackdrop />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 4, md: 6 }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        sx={{ position: 'relative' }}
      >
        <Box sx={{ maxWidth: 640 }}>
          <Box
            component={m.div}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            sx={{
              mb: 2,
              px: 1.5,
              py: 0.5,
              gap: 0.75,
              borderRadius: 5,
              display: 'inline-flex',
              alignItems: 'center',
              typography: 'subtitle2',
              bgcolor: 'rgba(255,255,255,0.16)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Box
              component={m.span}
              animate={reduceMotion ? undefined : { rotate: [0, 18, -8, 18, 0] }}
              transition={{ duration: 1.4, delay: 0.6, repeat: Infinity, repeatDelay: 4 }}
              sx={{ display: 'inline-flex', transformOrigin: '70% 70%' }}
            >
              <Iconify icon="eva:smiling-face-fill" width={18} />
            </Box>
            {firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
          </Box>

          <AnimatedAboutHeading text="Policy Handbook" />

          <Box
            component={m.div}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Typography sx={{ mt: 3, opacity: 0.92, fontSize: { xs: 15, md: 17 }, lineHeight: 1.6 }}>
              Everything you need to know about working at BNW, in one friendly place: who we are, how
              we work and what we expect from each other.
            </Typography>

            <Stack direction="row" flexWrap="wrap" sx={{ mt: 2.5, gap: 1 }}>
              {stats.map((stat) => (
                <Stack
                  key={stat.label}
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1,
                    typography: 'caption',
                    fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                >
                  <Iconify icon={stat.icon} width={16} />
                  <span>{stat.label}</span>
                </Stack>
              ))}
            </Stack>

            <Stack direction="row" flexWrap="wrap" alignItems="center" sx={{ mt: 3.5, gap: 1.5 }}>
              {!signed && (
                <Button
                  size="large"
                  variant="contained"
                  onClick={readAll ? onSign : onStart}
                  endIcon={<Iconify icon={readAll ? 'solar:pen-bold' : 'eva:arrow-forward-fill'} />}
                  sx={{
                    color: 'primary.dark',
                    bgcolor: 'common.white',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                >
                  {readAll ? 'Sign the handbook' : readCount ? 'Continue reading' : 'Start reading'}
                </Button>
              )}
              {canEdit && (
                <Button
                  color="inherit"
                  variant="outlined"
                  onClick={onEdit}
                  startIcon={<Iconify icon="solar:pen-bold" />}
                  sx={{ borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  Edit CEO message
                </Button>
              )}
            </Stack>
          </Box>
        </Box>

        {/* Progress ring with topic icons floating round it. */}
        <Stack alignItems="center" spacing={2} sx={{ flexShrink: 0, alignSelf: { xs: 'center', md: 'center' } }}>
          <Box sx={{ position: 'relative', p: 3 }}>
            {FLOATERS.map((f) => (
              <Box
                key={f.icon}
                component={m.div}
                aria-hidden
                animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 3.2, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
                sx={{
                  top: f.top,
                  left: f.left,
                  width: 34,
                  height: 34,
                  zIndex: 1,
                  display: 'flex',
                  borderRadius: 1.25,
                  position: 'absolute',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }}
              >
                <Iconify icon={f.icon} width={18} />
              </Box>
            ))}
            <ProgressRing readCount={readCount} total={total} signed={signed} />
          </Box>
          <Typography variant="body2" sx={{ maxWidth: 240, textAlign: 'center', opacity: 0.9 }}>
            {status}
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}
