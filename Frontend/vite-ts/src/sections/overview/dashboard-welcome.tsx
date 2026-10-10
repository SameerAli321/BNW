import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { avatarSrc } from 'src/actions/users';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type Props = {
  name: string;
  role?: string;
  avatarUrl?: string | null;
};

// BNW OMS: welcome banner at the top of every role's dashboard — a soft blue → emerald wash with
// the user's avatar (sm+), role, a time-of-day greeting, today's date and (md+) the firm's motto
// on the right. The curved shapes are palette-tinted SVG paths, so it follows light / dark mode.
export function DashboardWelcome({ name, role, avatarUrl }: Props) {
  const now = new Date();

  return (
    <Box
      sx={(theme) => ({
        p: { xs: 2.5, sm: 3, md: 4 },
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.12)}`,
        backgroundImage: `linear-gradient(115deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.07)} 0%, ${varAlpha(theme.vars.palette.info.mainChannel, 0.04)} 50%, ${varAlpha(theme.vars.palette.success.mainChannel, 0.08)} 100%)`,
      })}
    >
      {/* Gentle curved shapes along the bottom — purely visual, hidden from assistive tech. */}
      <Box
        component="svg"
        aria-hidden
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        sx={(theme) => ({
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 1,
          height: { xs: 56, md: 88 },
          pointerEvents: 'none',
          '& .wave-1': { fill: varAlpha(theme.vars.palette.primary.mainChannel, 0.05) },
          '& .wave-2': { fill: varAlpha(theme.vars.palette.success.mainChannel, 0.07) },
        })}
      >
        <path className="wave-1" d="M0 70 C 180 20 360 110 560 60 S 760 30 800 50 V120 H0 Z" />
        <path className="wave-2" d="M0 100 C 220 60 420 120 620 85 S 760 70 800 80 V120 H0 Z" />
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        spacing={3}
        sx={{ position: 'relative' }}
      >
        <Stack direction="row" alignItems="center" spacing={{ sm: 2.5 }} sx={{ minWidth: 0 }}>
        <Avatar
          src={avatarSrc(avatarUrl)}
          alt={name}
          sx={(theme) => ({
            width: 72,
            height: 72,
            fontSize: 28,
            flexShrink: 0,
            display: { xs: 'none', sm: 'flex' },
            color: 'primary.main',
            bgcolor: 'primary.lighter',
            border: `3px solid ${theme.vars.palette.background.paper}`,
            boxShadow: `0 4px 12px ${varAlpha(theme.vars.palette.secondary.mainChannel, 0.08)}`,
          })}
        >
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Stack spacing={1.25} sx={{ minWidth: 0 }}>
          {role && (
            <Label color="success" variant="soft" sx={{ alignSelf: 'flex-start' }}>
              {role}
            </Label>
          )}
          <Typography variant="h4" sx={{ wordBreak: 'break-word' }}>
            {greeting(now.getHours())}, {name}!
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Here&apos;s what&apos;s happening across BNW Chartered Accountants today.
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ pt: 0.5, color: 'text.secondary', typography: 'subtitle2' }}
          >
            <Iconify icon="mingcute:calendar-day-line" width={18} sx={{ color: 'primary.main' }} />
            <Box component="time" dateTime={fDate(now, 'YYYY-MM-DD')}>
              {fDate(now)}
              <Box component="span" sx={{ mx: 1, color: 'text.disabled' }}>
                |
              </Box>
              {fDate(now, 'dddd')}
            </Box>
          </Stack>
        </Stack>
        </Stack>

        <Box
          component="figure"
          sx={{ m: 0, pr: 2, flexShrink: 0, maxWidth: 300, display: { xs: 'none', md: 'block' } }}
        >
          <Iconify
            icon="mingcute:quote-left-fill"
            width={24}
            sx={{ mb: 1, color: (theme) => varAlpha(theme.vars.palette.success.mainChannel, 0.48) }}
          />
          <Typography
            component="blockquote"
            variant="subtitle1"
            sx={{ m: 0, fontStyle: 'italic', fontWeight: 500, color: 'text.primary' }}
          >
            Good accounting builds a stronger tomorrow.
          </Typography>
          <Box sx={{ mt: 1.5, width: 40, height: 3, borderRadius: 2, bgcolor: 'success.main' }} />
        </Box>
      </Stack>
    </Box>
  );
}
