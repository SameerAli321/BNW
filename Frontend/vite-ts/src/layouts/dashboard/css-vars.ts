import type { Theme, CSSObject } from '@mui/material/styles';
import type { SettingsState } from 'src/components/settings';

import { varAlpha } from 'minimal-shared/utils';

import { bnwSidebar } from 'src/theme/bnw-sidebar';

import { bulletColor } from 'src/components/nav-section';

// ----------------------------------------------------------------------

export function dashboardLayoutVars(theme: Theme) {
  return {
    '--layout-transition-easing': 'linear',
    '--layout-transition-duration': '120ms',
    // BNW OMS: 90% of the template's widths, matching the 90% type + spacing scale.
    '--layout-nav-mini-width': '80px',
    '--layout-nav-vertical-width': '270px',
    '--layout-nav-horizontal-height': '64px',
    '--layout-dashboard-content-pt': theme.spacing(1),
    '--layout-dashboard-content-pb': theme.spacing(8),
    '--layout-dashboard-content-px': theme.spacing(5),
  };
}

// ----------------------------------------------------------------------

export function dashboardNavColorVars(
  theme: Theme,
  navColor: SettingsState['navColor'] = 'integrate',
  navLayout: SettingsState['navLayout'] = 'vertical'
): Record<'layout' | 'section', CSSObject | undefined> {
  const {
    vars: { palette },
  } = theme;

  switch (navColor) {
    case 'integrate':
      return {
        layout: {
          // BNW OMS: the default sidebar — light, soft pastel blue (colours in
          // src/theme/bnw-sidebar.ts). Dark mode falls back to the template's dark background.
          '--layout-nav-bg': bnwSidebar.bg,
          '--layout-nav-horizontal-bg': bnwSidebar.bg,
          '--layout-nav-border-color': bnwSidebar.border,
          '--layout-nav-text-primary-color': palette.text.primary,
          '--layout-nav-text-secondary-color': bnwSidebar.text,
          '--layout-nav-text-disabled-color': palette.text.disabled,
          ...theme.applyStyles('dark', {
            '--layout-nav-bg': palette.background.default,
            '--layout-nav-border-color': varAlpha(palette.grey['500Channel'], 0.08),
            '--layout-nav-horizontal-bg': varAlpha(palette.background.defaultChannel, 0.96),
            '--layout-nav-text-primary-color': palette.text.primary,
            '--layout-nav-text-secondary-color': palette.text.secondary,
          }),
        },
        section: {
          // caption + subheader (small, letter-spaced uppercase — see nav-subheader.tsx)
          '--nav-item-caption-color': bnwSidebar.subheader,
          '--nav-subheader-color': bnwSidebar.subheader,
          '--nav-subheader-hover-color': bnwSidebar.activeText,
          // item — icons are a touch lighter than the label (`--nav-item-icon-color`)
          '--nav-item-color': bnwSidebar.text,
          '--nav-item-icon-color': bnwSidebar.icon,
          '--nav-item-hover-bg': bnwSidebar.hoverBg,
          '--nav-item-focus-ring': bnwSidebar.activeText,
          '--nav-icon-size': '22px',
          // Active item: subtle rounded pill, blue text + icon (semi-bold title, see nav-item).
          '--nav-item-root-active-color': bnwSidebar.activeText,
          '--nav-item-root-active-bg': bnwSidebar.activeBg,
          '--nav-item-root-active-hover-bg': bnwSidebar.activeBg,
          '--nav-item-root-open-color': bnwSidebar.text,
          '--nav-item-root-open-bg': bnwSidebar.hoverBg,
          // sub
          '--nav-item-sub-active-color': bnwSidebar.activeText,
          '--nav-item-sub-active-bg': bnwSidebar.hoverBg,
          '--nav-item-sub-open-color': bnwSidebar.text,
          '--nav-item-sub-open-bg': bnwSidebar.hoverBg,
          // Dark mode: back to the template's defaults (see nav-section/styles/css-vars.ts).
          ...theme.applyStyles('dark', {
            '--nav-item-caption-color': palette.text.disabled,
            '--nav-subheader-color': palette.text.disabled,
            '--nav-subheader-hover-color': palette.text.primary,
            '--nav-item-color': palette.text.secondary,
            '--nav-item-icon-color': 'currentColor',
            '--nav-item-hover-bg': palette.action.hover,
            '--nav-item-focus-ring': palette.primary.main,
            '--nav-item-root-active-bg': varAlpha(palette.primary.mainChannel, 0.08),
            '--nav-item-root-active-hover-bg': varAlpha(palette.primary.mainChannel, 0.16),
            '--nav-item-root-open-color': palette.text.primary,
            '--nav-item-root-open-bg': palette.action.hover,
            '--nav-item-sub-active-color': palette.text.primary,
            '--nav-item-sub-active-bg': palette.action.hover,
            '--nav-item-sub-open-color': palette.text.primary,
            '--nav-item-sub-open-bg': palette.action.hover,
          }),
        },
      };
    case 'apparent':
      // Template's original dark sidebar — just an optional setting now.
      return {
        layout: {
          '--layout-nav-bg': palette.grey[900],
          '--layout-nav-horizontal-bg': varAlpha(palette.grey['900Channel'], 0.96),
          '--layout-nav-border-color': 'transparent',
          '--layout-nav-text-primary-color': palette.common.white,
          '--layout-nav-text-secondary-color': palette.grey[500],
          '--layout-nav-text-disabled-color': palette.grey[600],
          ...theme.applyStyles('dark', {
            '--layout-nav-bg': palette.grey[800],
            '--layout-nav-horizontal-bg': varAlpha(palette.grey['800Channel'], 0.8),
          }),
        },
        section: {
          // caption
          '--nav-item-caption-color': palette.grey[600],
          // subheader
          '--nav-subheader-color': palette.grey[600],
          '--nav-subheader-hover-color': palette.common.white,
          // item
          '--nav-item-color': palette.grey[500],
          '--nav-item-root-active-color': palette.primary.light,
          '--nav-item-root-open-color': palette.common.white,
          // bullet
          '--nav-bullet-light-color': bulletColor.dark,
          // sub
          ...(navLayout === 'vertical' && {
            '--nav-item-sub-active-color': palette.common.white,
            '--nav-item-sub-open-color': palette.common.white,
          }),
        },
      };
    default:
      throw new Error(`Invalid color: ${navColor}`);
  }
}
