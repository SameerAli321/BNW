import type { ThemeOptions } from './types';

import { createPaletteChannel } from 'minimal-shared/utils';

// ----------------------------------------------------------------------

// BNW's actual brand colors, sampled directly from public/logo/logo-full.png (the icon mark's
// green and the "BNW" wordmark's blue) rather than approximated by eye:
//   - green mark  -> #42E226
//   - blue text   -> #0057FF
// `main` is NOT the raw sampled green: white text on #42E226 measures ~1.7:1 contrast (WCAG
// needs >=4.5:1 for normal text), so it would make button labels nearly unreadable. `main` is a
// deepened step of the same hue (~4.2:1, matches this theme's existing `success.dark`) so
// buttons/links stay accessible; `light` carries the true, vivid logo green for places that don't
// have text sitting directly on it (icon badges, chart bars, hover backgrounds, chips). The
// sampled blue is used as-is for `secondary.main` — it already measures ~5.5:1 with white text,
// no adjustment needed.
const BNW_GREEN = {
  lighter: '#D3FCD2',
  light: '#42E226',
  main: '#118D57',
  dark: '#0B6B41',
  darker: '#065E49',
  contrastText: '#FFFFFF',
};

const BNW_BLUE = {
  lighter: '#D6E4FF',
  light: '#5B8DFF',
  main: '#0057FF',
  dark: '#0040BF',
  darker: '#002B80',
  contrastText: '#FFFFFF',
};

export const themeOverrides: ThemeOptions = {
  colorSchemes: {
    light: {
      palette: {
        primary: createPaletteChannel(BNW_GREEN),
        secondary: createPaletteChannel(BNW_BLUE),
      },
    },
    dark: {
      palette: {
        primary: createPaletteChannel(BNW_GREEN),
        secondary: createPaletteChannel(BNW_BLUE),
      },
    },
  },
};
