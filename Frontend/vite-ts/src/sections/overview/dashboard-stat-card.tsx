import type { CardProps } from '@mui/material/Card';
import type { IconifyName } from 'src/components/iconify';
import type { PaletteColorKey } from 'src/theme/core/palette';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  icon: IconifyName;
  total: number | string;
  label: string;
  caption?: string;
  href?: string;
  color?: PaletteColorKey;
};

// BNW OMS: the "number + icon" tile at the top of every role dashboard (see bnw-overview-view.tsx).
// Tinted by `color`, with an optional caption under the label; when `href` is given the whole
// tile links to the page where that number is worked on.
export function DashboardStatCard({
  icon,
  total,
  label,
  caption,
  href,
  color = 'primary',
  sx,
  ...other
}: Props) {
  return (
    <Card
      {...(href ? { component: RouterLink, href } : {})}
      sx={[
        (theme) => ({
          p: 2.5,
          height: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
          overflow: 'hidden',
          textDecoration: 'none',
          backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].mainChannel, 0.1)}, ${varAlpha(theme.vars.palette[color].mainChannel, 0.02)})`,
          transition: theme.transitions.create(['box-shadow', 'transform']),
          '&:hover': {
            boxShadow: theme.customShadows[color],
            transform: 'translateY(-2px)',
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: 1.5,
          color: `${color}.dark`,
          bgcolor: (theme) => varAlpha(theme.vars.palette[color].mainChannel, 0.16),
        }}
      >
        <Iconify icon={icon} width={28} />
      </Stack>

      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography variant="h3" sx={{ lineHeight: 1.2 }}>
          {total}
        </Typography>
        {/* One line each, and the caption line is always reserved — so every tile in a row has
            the same height and its number sits at the same level, caption or not. */}
        <Typography variant="subtitle2" noWrap title={label} sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.disabled' }}>
          {caption || ' '}
        </Typography>
      </Stack>

      {/* Big faded icon in the corner for a bit of visual weight. */}
      <Box
        sx={{
          position: 'absolute',
          right: -16,
          bottom: -16,
          color: `${color}.main`,
          opacity: 0.08,
          pointerEvents: 'none',
        }}
      >
        <Iconify icon={icon} width={96} />
      </Box>
    </Card>
  );
}
