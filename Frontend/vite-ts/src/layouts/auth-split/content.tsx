import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';

import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';

import { layoutClasses } from '../core';

// ----------------------------------------------------------------------

export type AuthSplitContentProps = BoxProps & { layoutQuery?: Breakpoint };

export function AuthSplitContent({
  sx,
  children,
  className,
  layoutQuery = 'md',
  ...other
}: AuthSplitContentProps) {
  return (
    <Box
      className={mergeClasses([layoutClasses.content, className])}
      sx={[
        (theme) => ({
          display: 'flex',
          flex: '1 1 auto',
          alignItems: 'center',
          flexDirection: 'column',
          p: theme.spacing(3, 2, 10, 2),
          [theme.breakpoints.up(layoutQuery)]: {
            justifyContent: 'center',
            p: theme.spacing(10, 2, 10, 2),
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {/*
        BNW OMS: from `sm` up the form sits on a clean card; on phones it stays flat and
        full-width so the fields get the whole screen.
      */}
      <Box
        sx={(theme) => ({
          width: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 'var(--layout-auth-content-width)',
          [theme.breakpoints.up('sm')]: {
            p: 5,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: theme.vars.customShadows.card,
            maxWidth: `calc(var(--layout-auth-content-width) + ${theme.spacing(10)})`,
          },
        })}
      >
        {children}
      </Box>
    </Box>
  );
}
