import type { Theme, Direction, CommonColors, ThemeProviderProps } from '@mui/material/styles';
import type { ThemeColorScheme, ThemeCssVariables } from './types';
import type { PaletteColorKey, PaletteColorNoChannels } from './core/palette';

// ----------------------------------------------------------------------

export type ThemeConfig = {
  direction: Direction;
  classesPrefix: string;
  colorScheme: ThemeColorScheme;
  cssVariables: ThemeCssVariables;
  defaultMode: ThemeProviderProps<Theme>['defaultMode'];
  modeStorageKey: ThemeProviderProps<Theme>['modeStorageKey'];
  fontFamily: Record<'primary' | 'secondary', string>;
  palette: Record<PaletteColorKey, PaletteColorNoChannels> & {
    common: Pick<CommonColors, 'black' | 'white'>;
    grey: {
      [K in 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 as `${K}`]: string;
    };
  };
};

export const themeConfig: ThemeConfig = {
  /** **************************************
   * Base
   *************************************** */
  defaultMode: 'light',
  colorScheme: 'light',
  modeStorageKey: 'theme-mode',
  direction: 'ltr',
  classesPrefix: 'minimal',
  /** **************************************
   * Css variables
   *************************************** */
  cssVariables: {
    cssVarPrefix: '',
    colorSchemeSelector: 'data-color-scheme',
  },
  /** **************************************
   * Typography
   *************************************** */
  fontFamily: {
    primary: 'Inter Variable',
    secondary: 'Barlow',
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    // BNW brand design system (see the client's UI brief). Blue drives actions, navy is the
    // brand surface (sidebar, headings), emerald is reserved for success / positive states.
    primary: {
      lighter: '#DBEAFE',
      light: '#60A5FA',
      main: '#2563EB',
      dark: '#1D4ED8',
      darker: '#1E3A8A',
      contrastText: '#FFFFFF',
    },
    // Premium navy — sidebar, important headings, secondary buttons.
    secondary: {
      lighter: '#D9E2EC',
      light: '#486581',
      main: '#102A43',
      dark: '#0B1F33',
      darker: '#061423',
      contrastText: '#FFFFFF',
    },
    info: {
      lighter: '#EFF6FF',
      light: '#7DD3FC',
      main: '#0284C7',
      dark: '#0369A1',
      darker: '#0C4A6E',
      contrastText: '#FFFFFF',
    },
    // Emerald green — approved / successful / positive metrics.
    success: {
      lighter: '#E8F7EF',
      light: '#5FCB9A',
      main: '#16A36A',
      dark: '#0F7A4F',
      darker: '#0A5136',
      contrastText: '#FFFFFF',
    },
    // Amber — pending actions and warnings.
    warning: {
      lighter: '#FFF7E6',
      light: '#FBBF24',
      main: '#D97706',
      dark: '#B45309',
      darker: '#78350F',
      contrastText: '#FFFFFF',
    },
    // Red — errors, rejected requests, destructive actions.
    error: {
      lighter: '#FEF2F2',
      light: '#F87171',
      main: '#DC2626',
      dark: '#B91C1C',
      darker: '#7F1D1D',
      contrastText: '#FFFFFF',
    },
    grey: {
      // Slate greys; 200 is the brand border grey (#E2E8F0), 500 the secondary text (#64748B).
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
    common: {
      black: '#000000',
      white: '#FFFFFF',
    },
  },
};
