import type { BoxProps } from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import SvgIcon from '@mui/material/SvgIcon';
import ButtonBase from '@mui/material/ButtonBase';
import { styled, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { navItemStyles, navSectionCssVars } from 'src/components/nav-section';

import { useSignOut } from './sign-out-button';

// ----------------------------------------------------------------------

export type NavFooterProps = BoxProps & {
  isNavMini?: boolean;
  /** The same nav colour vars passed to the nav section, so these items match the menu above. */
  cssVars?: CSSObject;
  /** Closes the mobile drawer after navigating / signing out. */
  onClose?: () => void;
};

/**
 * BNW OMS: "Settings" + "Log out" pinned to the bottom of the sidebar (desktop, mini and the
 * mobile drawer). Settings opens the user's own account page; Log out reuses `useSignOut` from
 * sign-out-button.tsx — the same handler as the account drawer's Logout button.
 */
export function NavFooter({ isNavMini, cssVars, onClose, sx, ...other }: NavFooterProps) {
  const theme = useTheme();

  const pathname = usePathname();

  const handleSignOut = useSignOut(onClose);

  const settingsActive = pathname.startsWith(paths.dashboard.user.account);

  const renderItem = (label: string, icon: React.ReactNode, props: Record<string, unknown>) => {
    const item = (
      <FooterItem aria-label={label} isNavMini={isNavMini} {...props}>
        {icon}
        {!isNavMini && <span>{label}</span>}
      </FooterItem>
    );

    return isNavMini ? (
      <Tooltip title={label} placement="right" arrow>
        {item}
      </Tooltip>
    ) : (
      item
    );
  };

  return (
    <Box
      sx={[
        {
          ...navSectionCssVars.vertical(theme),
          ...cssVars,
          gap: 0.5,
          display: 'flex',
          flexShrink: 0,
          flexDirection: 'column',
          px: isNavMini ? 0.5 : 2,
          pt: 1.5,
          pb: 2,
          // Thin divider in the sidebar's border colour.
          borderTop: `1px solid var(--layout-nav-border-color, ${theme.vars.palette.divider})`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {renderItem('Settings', <Iconify icon="solar:settings-bold-duotone" width={22} />, {
        component: RouterLink,
        href: paths.dashboard.user.account,
        onClick: onClose,
        className: settingsActive ? 'active' : undefined,
        'aria-current': settingsActive ? 'page' : undefined,
      })}

      {renderItem('Log out', logoutIcon, { onClick: handleSignOut })}
    </Box>
  );
}

// ----------------------------------------------------------------------

const FooterItem = styled(ButtonBase, {
  shouldForwardProp: (prop: string) => !['isNavMini', 'sx'].includes(prop),
})<{ isNavMini?: boolean }>(({ isNavMini, theme }) => ({
  ...theme.typography.body2,
  width: '100%',
  minHeight: 44,
  gap: theme.spacing(1.5),
  justifyContent: isNavMini ? 'center' : 'flex-start',
  padding: isNavMini ? theme.spacing(1, 0.5) : theme.spacing(0.5, 1, 0.5, 1.5),
  borderRadius: 'var(--nav-item-radius)',
  color: 'var(--nav-item-color)',
  fontWeight: theme.typography.fontWeightMedium,
  '& > svg': { flexShrink: 0, color: 'var(--nav-item-icon-color)' },
  '&:hover': { backgroundColor: 'var(--nav-item-hover-bg)' },
  ...navItemStyles.interaction(theme),
  '&.active': {
    color: 'var(--nav-item-root-active-color)',
    '& > svg': { color: 'inherit' },
    backgroundColor: 'var(--nav-item-root-active-bg)',
    fontWeight: theme.typography.fontWeightSemiBold,
    '&:hover': { backgroundColor: 'var(--nav-item-root-active-hover-bg)' },
  },
}));

// No log-out glyph is in the offline Iconify set, so it's drawn inline (Solar duotone style:
// faded door panel + solid arrow leaving it).
const logoutIcon = (
  <SvgIcon sx={{ width: 22, height: 22 }}>
    <path
      fill="currentColor"
      opacity="0.4"
      d="M9 2h-1C5.172 2 3.757 2 2.879 2.879C2 3.757 2 5.172 2 8v8c0 2.828 0 4.243.879 5.121C3.757 22 5.172 22 8 22h1c2.828 0 4.243 0 5.121-.879C15 20.243 15 18.828 15 16V8c0-2.828 0-4.243-.879-5.121C13.243 2 11.828 2 9 2"
    />
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.25 12a.75.75 0 0 1 .75-.75h10.973l-1.961-1.68a.75.75 0 1 1 .976-1.14l3.5 3a.75.75 0 0 1 0 1.14l-3.5 3a.75.75 0 1 1-.976-1.14l1.96-1.68H9a.75.75 0 0 1-.75-.75"
    />
  </SvgIcon>
);
