import type { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function layoutSectionVars(theme: Theme) {
  return {
    '--layout-nav-zIndex': theme.zIndex.drawer + 1,
    '--layout-nav-mobile-width': '288px',
    '--layout-header-blur': '8px',
    '--layout-header-zIndex': theme.zIndex.appBar + 1,
    // BNW OMS: header / nav sizes at 90% of the template's, matching the 90% type + spacing scale.
    '--layout-header-mobile-height': '58px',
    '--layout-header-desktop-height': '65px',
  };
}
