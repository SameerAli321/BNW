import type { Theme, Components } from '@mui/material/styles';

import { formLabelClasses } from '@mui/material/FormLabel';
import { inputLabelClasses } from '@mui/material/InputLabel';

// ----------------------------------------------------------------------

/**
 * Applies label styles to TextField and Select.
 */
const MuiInputLabel: Components<Theme>['MuiInputLabel'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      color: theme.vars.palette.text.disabled,
      fontSize: theme.typography.body2.fontSize,
      lineHeight: theme.typography.body2.lineHeight,
      variants: [
        {
          props: (props) => !!props.shrink,
          style: {
            color: theme.vars.palette.text.secondary,
            fontSize: theme.typography.body1.fontSize,
            lineHeight: theme.typography.body1.lineHeight,
            fontWeight: theme.typography.fontWeightSemiBold,
          },
        },
        {
          props: (props) => !!props.shrink && !!props.focused,
          style: {
            [`&:not(.${inputLabelClasses.error})`]: {
              color: theme.vars.palette.primary.main,
            },
          },
        },
        {
          props: (props) => !!props.shrink && props.variant === 'filled' && props.size === 'medium',
          style: {
            transform: 'translate(12px, 6px) scale(0.75)',
          },
        },
      ],
    }),
  },
};

/**
 * Applies label styles to Checkbox, RadioGroup, Switch (not InputLabel).
 *
 * Note: `MuiInputLabel` extends `MuiFormLabel` by default.
 * To avoid conflict, we scope with `:not(.MuiInputLabel-root)`
 */
const formLabelSelector = {
  root: `&:not(.${inputLabelClasses.root})`,
};

const MuiFormLabel: Components<Theme>['MuiFormLabel'] = {
  //   // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      variants: [
        {
          props: (props) => !props.error,
          style: {
            [formLabelSelector.root]: {
              [`&.${formLabelClasses.focused}`]: {
                color: theme.vars.palette.text.secondary,
              },
            },
          },
        },
      ],
    }),
  },
};

const MuiFormHelperText: Components<Theme>['MuiFormHelperText'] = {
  // ▼▼▼▼▼▼▼▼ ⚙️ PROPS ▼▼▼▼▼▼▼▼
  defaultProps: {
    component: 'div',
  },
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    root: ({ theme }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      marginTop: theme.spacing(1),
      '& > svg': { width: 16, height: 16 },
    }),
  },
};

const MuiFormControlLabel: Components<Theme>['MuiFormControlLabel'] = {
  // ▼▼▼▼▼▼▼▼ 🎨 STYLE ▼▼▼▼▼▼▼▼
  styleOverrides: {
    label: ({ theme }) => ({
      ...theme.typography.body2,
    }),
  },
};

/* **********************************************************************
 * 🚀 Export
 * **********************************************************************/
export const form: Components<Theme> = {
  MuiFormLabel,
  MuiInputLabel,
  MuiFormHelperText,
  MuiFormControlLabel,
};
