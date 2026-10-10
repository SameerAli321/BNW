import type { Breakpoint } from '@mui/material/styles';
import type { NavItemProps, NavSectionProps } from 'src/components/nav-section';
import type { MainSectionProps, HeaderSectionProps, LayoutSectionProps } from '../core';

import { merge } from 'es-toolkit';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { Logo } from 'src/components/logo';
import { useSettingsContext } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';

import { NavMobile } from './nav-mobile';
import { VerticalDivider } from './content';
import { NavVertical } from './nav-vertical';
import { NavHorizontal } from './nav-horizontal';
import { _account } from '../nav-config-account';
import { Searchbar } from '../components/searchbar';
import { NavFooter } from '../components/nav-footer';
import { MenuButton } from '../components/menu-button';
import { AccountDrawer } from '../components/account-drawer';
import { SettingsButton } from '../components/settings-button';
import { navData as dashboardNavData } from '../nav-config-dashboard';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';
import { NotificationsPopover } from '../components/notifications-popover';
import { MainSection, layoutClasses, HeaderSection, LayoutSection } from '../core';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    nav?: {
      data?: NavSectionProps['data'];
    };
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const theme = useTheme();

  // Real logged-in user (BNW OMS), not the template's demo `useMockedUser` — role-based nav
  // filtering below must reflect the actual role from the backend (see docs/API_CONTRACT_SPRINT1.md).
  const { user } = useAuthContext();

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navData = slotProps?.nav?.data ?? dashboardNavData;

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const canDisplayItemByRole = (allowedRoles: NavItemProps['allowedRoles']): boolean =>
    !allowedRoles?.includes(user?.role);

  // The original BNW logo (blue + green, unchanged per the client brief) at the top of the pastel
  // sidebar — no white plate. Shared by the desktop sidebar and the mobile drawer so both match.
  const renderNavLogo = () => (
    <Box sx={{ px: 3, pt: 3, pb: 2, textAlign: 'center' }}>
      <Logo isSingle={false} sx={{ width: 190, height: 60, mx: 'auto' }} />
    </Box>
  );

  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        maxWidth: false,
        sx: {
          ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
          // BNW OMS: the top bar stays white in every nav layout (see the header `sx` below), so
          // the horizontal layout no longer paints it with the nav colour — only its nav strip.
          ...(isNavHorizontal && {
            height: { [layoutQuery]: 'var(--layout-nav-horizontal-height)' },
          }),
        },
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      bottomArea: isNavHorizontal ? (
        <NavHorizontal
          data={navData}
          layoutQuery={layoutQuery}
          cssVars={navVars.section}
          checkPermissions={canDisplayItemByRole}
        />
      ) : null,
      leftArea: (
        <>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          <NavMobile
            data={navData}
            open={open}
            onClose={onClose}
            cssVars={navVars.section}
            checkPermissions={canDisplayItemByRole}
            slots={{
              topArea: renderNavLogo(),
              bottomArea: <NavFooter cssVars={navVars.section} onClose={onClose} />,
            }}
          />

          {/** @slot Logo (phones/tablets — the sidebar holding it is hidden below layoutQuery) */}
          <Logo
            isMark
            sx={{
              width: 32,
              height: 32,
              display: { xs: 'inline-flex', sm: 'none' },
              [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
            }}
          />
          <Logo
            sx={{
              width: 116,
              height: 36,
              display: { xs: 'none', sm: 'inline-flex' },
              [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
            }}
          />

          {/** @slot Logo */}
          {isNavHorizontal && (
            <Logo
              sx={{
                display: 'none',
                [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
              }}
            />
          )}

          {/** @slot Divider */}
          {isNavHorizontal && (
            <VerticalDivider sx={{ [theme.breakpoints.up(layoutQuery)]: { display: 'flex' } }} />
          )}
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 1 } }}>
          {/** @slot Searchbar */}
          <Searchbar data={navData} />

          {/** @slot Notifications bell */}
          <NotificationsPopover />

          {/** @slot Settings button — opens the theme drawer (colours, mode, sidebar), saved per user */}
          <SettingsButton />

          {/** @slot Account drawer */}
          <AccountDrawer data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        disableElevation={isNavVertical}
        // Solid white bar, so the template's scroll-in blur layer isn't needed.
        disableOffset
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={[
          {
            // BNW OMS: white top bar with a subtle bottom border over the background.default content area.
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.vars.palette.grey[200]}`,
            ...theme.applyStyles('dark', { borderColor: theme.vars.palette.divider }),
          },
          ...(Array.isArray(slotProps?.header?.sx) ? slotProps.header.sx : [slotProps?.header?.sx]),
        ]}
      />
    );
  };

  const renderSidebar = () => (
    <NavVertical
      data={navData}
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      cssVars={navVars.section}
      checkPermissions={canDisplayItemByRole}
      slots={{
        // Big, interactive brand mark above the nav items. `logo-full.png` already renders "BNW
        // CHARTERED ACCOUNTANTS" as part of the artwork, so no separate Typography name here —
        // that was showing the company name twice. Logo itself has hover/press feedback built in
        // (see src/components/logo/logo.tsx).
        // Collapsed ("mini") sidebar is too narrow for the wordmark — show the round mark only.
        topArea: isNavMini ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2.5, pb: 1.5 }}>
            <Logo isMark />
          </Box>
        ) : (
          renderNavLogo()
        ),
        // BNW OMS has no paid tier — the minimal-kit's demo "Upgrade to Pro" card is replaced by
        // the Settings / Log out footer (also in the mobile drawer above).
        bottomArea: <NavFooter isNavMini={isNavMini} cssVars={navVars.section} />,
      }}
      onToggleNav={() =>
        settings.setField(
          'navLayout',
          settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
        )
      }
    />
  );

  const renderFooter = () => null;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={isNavHorizontal ? null : renderSidebar()}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}
