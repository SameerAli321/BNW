import type { SettingsState } from './types';

import { CONFIG } from 'src/global-config';
import { themeConfig } from 'src/theme/theme-config';

// ----------------------------------------------------------------------

export const SETTINGS_STORAGE_KEY: string = 'app-settings';

export const defaultSettings: SettingsState = {
  colorScheme: themeConfig.colorScheme,
  direction: themeConfig.direction,
  contrast: 'default',
  navLayout: 'vertical',
  primaryColor: 'default',
  // Soft pastel-blue sidebar (src/theme/bnw-sidebar.ts, applied in dashboardNavColorVars
  // 'integrate') per the client's UI brief. Still user-adjustable via the settings drawer.
  navColor: 'integrate',
  compactLayout: true,
  // 90% of 16px — the client wanted the app to look like it does at 90% browser zoom (spacing is
  // scaled to match in theme/create-theme.ts).
  fontSize: 14.4,
  fontFamily: themeConfig.fontFamily.primary,
  version: CONFIG.appVersion,
};
