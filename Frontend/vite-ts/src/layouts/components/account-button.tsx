import type { IconButtonProps } from '@mui/material/IconButton';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { varTap, varHover, AnimateBorder, transitionTap } from 'src/components/animate';

// ----------------------------------------------------------------------

export type AccountButtonProps = IconButtonProps & {
  photoURL: string;
  displayName: string;
  /**
   * BNW OMS: when given, the button also shows the name + this caption (the user's role) and a
   * chevron on md+ — the dashboard header's account chip. Avatar-only below md, and everywhere
   * it's omitted (e.g. account-popover.tsx).
   */
  caption?: string;
};

export function AccountButton({ photoURL, displayName, caption, sx, ...other }: AccountButtonProps) {
  const renderAvatar = () => (
    <AnimateBorder
      sx={{ p: '3px', borderRadius: '50%', width: 40, height: 40, flexShrink: 0 }}
      slotProps={{
        primaryBorder: { size: 60, width: '1px', sx: { color: 'primary.main' } },
        secondaryBorder: { sx: { color: 'warning.main' } },
      }}
    >
      <Avatar src={photoURL} alt={displayName} sx={{ width: 1, height: 1 }}>
        {displayName?.charAt(0).toUpperCase()}
      </Avatar>
    </AnimateBorder>
  );

  if (caption === undefined) {
    return (
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Account button"
        sx={[{ p: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
        {...other}
      >
        {renderAvatar()}
      </IconButton>
    );
  }

  return (
    <IconButton
      aria-label="Account button"
      sx={[
        (theme) => ({
          p: 0,
          gap: 1.25,
          borderRadius: { xs: '50%', md: 1.5 },
          [theme.breakpoints.up('md')]: { py: 0.5, pl: 0.5, pr: 1 },
          '&:hover': { bgcolor: 'action.hover' },
          '&.Mui-focusVisible': {
            outline: `2px solid ${theme.vars.palette.primary.main}`,
            outlineOffset: 2,
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {renderAvatar()}

      <Box
        sx={{
          minWidth: 0,
          maxWidth: 160,
          textAlign: 'left',
          flexDirection: 'column',
          display: { xs: 'none', md: 'flex' },
        }}
      >
        <Typography variant="subtitle2" noWrap sx={{ color: 'text.primary', lineHeight: 1.3 }}>
          {displayName}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
          {caption}
        </Typography>
      </Box>

      <Iconify
        width={16}
        icon="eva:arrow-ios-downward-fill"
        sx={{ color: 'text.secondary', display: { xs: 'none', md: 'inline-flex' } }}
      />
    </IconButton>
  );
}
