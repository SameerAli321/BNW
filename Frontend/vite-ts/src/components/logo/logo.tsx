import type { LinkProps } from '@mui/material/Link';

import { mergeClasses } from 'minimal-shared/utils';

import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = LinkProps & {
  isSingle?: boolean;
  disabled?: boolean;
};

// BNW OMS: real company logo, served from public/logo/ (see CONFIG.assetsDir).
//
// `logo-full.png` (icon + "BNW CHARTERED ACCOUNTANTS" wordmark, ~436x135, ~3.2:1, transparent
// background) is used for BOTH the `isSingle` and full slot — per explicit instruction, always
// show the full wordmark, never an icon-only crop. An earlier attempt auto-cropped just the round
// icon out of the source artwork (`logo-single.png`, still on disk but unused here), but the crop
// bled in part of the "B" and the "CHARTERED" subtitle line (they're not cleanly separable by a
// simple column split), so it read as a broken/cut-off logo. Simplest correct fix: always render
// the one clean asset. If a real transparent icon-only mark is provided later, swap it back in for
// the `isSingle` case specifically.
export function Logo({ sx, disabled, className, href = '/', isSingle = true, ...other }: LogoProps) {
  const logoImg = (
    <img
      alt="BNW Chartered Accountants"
      src={`${CONFIG.assetsDir}/logo/logo-full.png`}
      width="100%"
      height="100%"
      style={{ objectFit: 'contain' }}
    />
  );

  return (
    <LogoRoot
      component={RouterLink}
      href={href}
      aria-label="Logo"
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        {
          // ~3.2:1, matching logo-full.png's real aspect ratio — same box for both slots since
          // both now render the same image.
          width: isSingle ? 130 : 160,
          height: isSingle ? 41 : 50,
          ...(disabled && { pointerEvents: 'none' }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {logoImg}
    </LogoRoot>
  );
}

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(({ theme }) => ({
  flexShrink: 0,
  color: 'transparent',
  display: 'inline-flex',
  verticalAlign: 'middle',
  // BNW OMS: the logo is a link home, so give it real hover/press feedback — same "clickable"
  // language as buttons elsewhere in the app (see src/theme/core/components/button.tsx), scaled
  // up a bit since this is a bigger, more prominent element than a typical icon button.
  transition: theme.transitions.create(['transform', 'filter'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    transform: 'scale(1.06)',
    filter: `drop-shadow(0 4px 10px ${theme.vars.palette.grey[500]}40)`,
  },
  '&:active': { transform: 'scale(0.98)' },
}));
