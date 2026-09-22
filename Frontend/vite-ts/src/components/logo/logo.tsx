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

// BNW OMS: real company logo, served from public/logo/ (see CONFIG.assetsDir). The template's
// original inline "M." SVG mark is gone — `logo-full.png`/`logo-full.png` are currently both
// the same full wordmark file (icon + "BNW CHARTERED ACCOUNTANTS" text on a white background)
// because we don't yet have a separate transparent-background, icon-only crop suitable for the
// compact/collapsed sidebar slot. Ask for one and swap `logo-full.png` alone once available.
export function Logo({ sx, disabled, className, href = '/', isSingle = true, ...other }: LogoProps) {
  const singleLogo = (
    <img alt="BNW logo" src={`${CONFIG.assetsDir}/logo/logo-full.png`} width="100%" height="100%" style={{ objectFit: 'contain' }} />
  );

  const fullLogo = (
    <img alt="BNW logo" src={`${CONFIG.assetsDir}/logo/logo-full.png`} width="100%" height="100%" style={{ objectFit: 'contain' }} />
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
          width: 52,
          height: 36,
          ...(!isSingle && { width: 140, height: 44 }),
          ...(disabled && { pointerEvents: 'none' }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {isSingle ? singleLogo : fullLogo}
    </LogoRoot>
  );
}

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  color: 'transparent',
  display: 'inline-flex',
  verticalAlign: 'middle',
}));
