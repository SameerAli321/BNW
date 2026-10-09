import type { SettingsState } from './types';
import type { ThemeColorScheme } from 'src/theme/types';

import { useRef, useEffect } from 'react';
import { getStorage, setStorage } from 'minimal-shared/utils';

import { useColorScheme } from '@mui/material/styles';

import { useAuthContext } from 'src/auth/hooks';

import { useSettingsContext } from './context';
import { SETTINGS_STORAGE_KEY } from './settings-config';

// ----------------------------------------------------------------------

/** Each user's theme choices live under their own key, e.g. `app-settings:user:12`. */
export const userSettingsKey = (userId: number | string) =>
  `${SETTINGS_STORAGE_KEY}:user:${userId}`;

/**
 * Makes the settings drawer (colours, mode, sidebar, font…) per user: when someone logs in their
 * own saved choices are applied, every change they make is saved for them, and logging out goes
 * back to the defaults — so people sharing a computer don't inherit each other's theme.
 * Render inside AuthProvider, SettingsProvider and ThemeProvider.
 */
export function UserSettingsSync({ defaultSettings }: { defaultSettings: SettingsState }) {
  const { user } = useAuthContext();
  const settings = useSettingsContext();
  const { setMode } = useColorScheme();

  const key = user?.id ? userSettingsKey(user.id) : null;
  const loadedKey = useRef<string | null>(null);

  // Apply the user's saved settings on login / user switch; reset to defaults on logout.
  useEffect(() => {
    if (key === loadedKey.current) return;

    let next = defaultSettings;
    if (key) {
      const saved = getStorage<SettingsState>(key);
      if (saved && saved.version === defaultSettings.version)
        next = { ...defaultSettings, ...saved };
    }
    loadedKey.current = key;
    settings.setState(next);
    setMode(next.colorScheme as ThemeColorScheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Save every change for the logged-in user.
  useEffect(() => {
    if (key && loadedKey.current === key) setStorage(key, settings.state);
  }, [key, settings.state]);

  return null;
}
