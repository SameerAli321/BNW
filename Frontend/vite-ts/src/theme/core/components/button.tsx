import type { Theme, CSSObject, Components, ComponentsVariants } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';

// ----------------------------------------------------------------------

/**
 * TypeScript extension for MUI theme augmentation.
 * @to {@link file://./../../extend-theme-types.d.ts}
 */

export type ButtonExtendVariant = {
  soft: true;
};

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;

const DIMENSIONS: Record<string, CSSObject> = {
  small: { height: 30, paddingLeft: 8, paddingRight: 8 },
  medium: { paddingLeft: 12, paddingRight: 12 },
  large: { height: 48, paddingLeft: 16, paddingRight: 16 },
  smallText: { paddingLeft: 4, paddingRight: 4 },
  mediumText: { paddingLeft: 8, paddingRight: 8 },
  largeText: { paddingLeft: 10, paddingRight: 10 },
};

/* **********************************************************************
 * 🗳️ Variants
 * **********************************************************************/
const containedVariants = [
  {
    props: (props) => props.variant === 'contained' && props.color === 'inherit',
    style: ({ theme }) => ({
      ...theme.mixins.filledStyles(theme, 'inherit', {
        hover: {
          boxShadow: theme.vars.customShadows.z8,
        },
      }),
    }),
  },
  ...(COLORS.map((colorKey) => ({
    props: (props) => props.variant === 'contained' && props.color === colorKey,
    style: ({ theme }) => ({
      '&:hover': {
        boxShadow: theme.vars.customShadows[colorKey],
      },
    }),
  })) satisfies ComponentsVariants<Theme>['MuiButton']),
] satisfies ComponentsVariants<Theme>['MuiButton'];

const outlinedVariants = [
  {
    props: (props) => props.variant === 'outlined',
    style: {
      '&:hover': {
        borderColor: 'currentColor',
        boxShadow: '0 0 0 0.75px currentColor',
      },
    },
  },
  {
    props: (props) => props.variant === 'outlined' && props.color === 'inherit',
    style: ({ theme }) => ({
      borderColor: theme.vars.palette.shared.buttonOutlined,
      '&:hover': {
        backgroundColor: theme.vars.palette.action.hover,
      },
    }),
  },
  ...(COLORS.map((colorKey) => ({
    props: (props) => props.variant === 'outlined' && props.color === colorKey,
    style: ({ theme }) => ({
      borderColor: varAlpha(theme.vars.palette[colorKey].mainChannel, 0.48),
    }),
  })) satisfies ComponentsVariants<Theme>['MuiButton']),
] satisfies ComponentsVariants<Theme>['MuiButton'];

const textVariants = [
  {
    props: (props) => props.variant === 'text' && props.color === 'inherit',
    style: ({ theme }) => ({
      '&:hover': {
        backgroundColor: theme.vars.palette.action.hover,
      },
    }),
  },
] satisfies ComponentsVariants<Theme>['MuiButton'];

const softVariants = [
  {
    props: (props) => props.variant === 'soft' && props.color === 'inherit',
    style: ({ theme }) => ({
      ...theme.mixins.softStyles(theme, 'inherit', { hover: true }),
    }),
  },
  ...(COLORS.map((colorKey) => ({
    props: (props) => props.variant === 'soft' && props.color === colorKey,
    style: ({ theme }) => ({
      ...theme.mixins.softStyles(theme, colorKey, { hover: true }),
    }),
  })) satisfies ComponentsVariants<Theme>['MuiButton']),
] satisfies ComponentsVariants<Theme>['MuiButton'];

const sizeVariants = [
  {
    props: (props) => props.size === 'small',
    style: { ...DIMENSIONS.small },
  },
  {
    props: (props) => props.size === 'medium',
    style: { ...DIMENSIONS.medium },
  },
  {
    props: (props) => props.size === 'large',
    style: { ...DIMENSIONS.large },
  },
  {
    props: (props) => props.size === 'small' && props.variant === 'text',
    style: { ...DIMENSIONS.smallText },
  },
  {
    props: (props) => props.size === 'medium' && props.variant === 'text',
    style: { ...DIMENSIONS.mediumText },
  },
  {
    props: (props) => props.size === 'large' && props.variant === 'text',
    style: { ...DIMENSIONS.largeText },
  },
] satisfies ComponentsVariants<Theme>['MuiButton'];

const disabledVariants = [
  {
    props: (props) => (!!props.loading || !!props.disabled) && props.variant === 'soft',
    style: ({ theme }) => ({
      backgroundColor: theme.vars.palette.action.disabledBackground,
    }),
  },
] satisfies ComponentsVariants<Theme>['MuiButton'];

/* **********************************************************************
 * 🧩 Components
 * **********************************************************************/
const MuiButtonBase: Components<Theme>['MuiButtonBase'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      fontFamily: theme.typography.fontFamily,
      // BNW OMS: every ButtonBase-derived control (IconButton, ListItemButton/nav items, Tab,
      // pagination buttons, …) gets the same subtle press feedback as MuiButton above, so the
      // whole app feels consistently clickable rather than just the primary action buttons.
      // Uses `opacity`, not `transform`, deliberately: some ButtonBase-derived controls (e.g.
      // the sidebar's collapse toggle, `nav-toggle-button.tsx`) already use `transform` for their
      // own positioning (`translate(-50%, -50%)`), and a global `&:active { transform: scale() }`
      // here silently overwrote that mid-click, which could make the click miss its target
      // entirely. `opacity` can't collide with anything's layout/positioning.
      transition: theme.transitions.create('opacity', {
        duration: theme.transitions.duration.shortest,
      }),
      '&:active': { opacity: 0.72 },
    }),
  },
};

const MuiButton: Components<Theme>['MuiButton'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    color: 'inherit',
    disableElevation: true,
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      // BNW OMS: subtle lift on hover, press-down on click — tactile feedback so buttons feel
      // clickable rather than flat/static. Kept small (1px / 3% scale) to stay in the "minimal"
      // design language rather than reading as flashy.
      transition: theme.transitions.create(['transform', 'box-shadow'], {
        duration: theme.transitions.duration.shortest,
      }),
      '&:hover': { transform: 'translateY(-1px)' },
      '&:active': { transform: 'translateY(0) scale(0.97)' },
      variants: [
        ...containedVariants,
        ...outlinedVariants,
        ...textVariants,
        ...softVariants,
        ...sizeVariants,
        ...disabledVariants,
      ],
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const button: Components<Theme> = {
  MuiButton,
  MuiButtonBase,
};
