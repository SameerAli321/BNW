import type { ReactNode } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------
// Shared look for both About us pages ("What is BNW" and "CEO's Message"): the BNW logo's own
// colours, one font (the app's theme font — no second typeface), the same headings and the same
// faint grid background, so the two pages read as one set.

// Sampled from public/logo/logo-full.png: royal blue ("CHARTERED ACCOUNTANTS", the mark) and
// bright green ("BNW"). Navy is the brand surface (sidebar, headings).
export const BRAND_BLUE = '#0A4FEE';
export const BRAND_GREEN = '#40E325';
export const BRAND_NAVY = '#0B1F33';
export const BRAND_BLUE_SOFT = '#E7EEFE';

/** Brand-blue text, lightened in dark mode so it stays readable on a dark card. */
export const brandBlueText = (theme: Theme) => ({
  color: BRAND_BLUE,
  ...theme.applyStyles('dark', { color: '#7EA6FF' }),
});

/** Navy headings and names; plain light text in dark mode. */
export const brandNavyText = (theme: Theme) => ({
  color: BRAND_NAVY,
  ...theme.applyStyles('dark', { color: theme.vars.palette.text.primary }),
});

/** The faint grid behind both pages' hero cards, like the reference posters. */
export const gridBackground = (theme: Theme) => {
  const line = `rgba(${theme.vars.palette.grey['500Channel']} / 0.09)`;
  return {
    backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
    backgroundSize: '44px 44px',
    backgroundPosition: '-1px -1px',
  };
};

/** Big display heading — same weight and tracking on both pages. */
export const displayHeading = {
  m: 0,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  wordBreak: 'break-word',
} as const;

/** Small green dash + spaced uppercase label above a heading. */
export function Eyebrow({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={sx}>
      <Box sx={{ width: 28, height: 3, borderRadius: 2, bgcolor: BRAND_GREEN, flexShrink: 0 }} />
      <Typography
        variant="overline"
        sx={(theme) => ({ ...brandBlueText(theme), letterSpacing: 2.5, lineHeight: 1.4 })}
      >
        {children}
      </Typography>
    </Stack>
  );
}

/** The short green rule under headings. */
export function GreenRule({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={[
        { width: 88, height: 6, borderRadius: 3, bgcolor: BRAND_GREEN },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
