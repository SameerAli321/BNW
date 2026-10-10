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
  /**
   * % change vs. 7 days ago, computed from real records by the caller (see
   * dashboard-user-overview.tsx). `null` / omitted = no history to compare against → hidden.
   */
  trend?: number | null;
  href?: string;
  color?: PaletteColorKey;
};

function TrendIndicator({ value }: { value: number }) {
  const rounded = Math.round(value * 10) / 10;
  const flat = rounded === 0;
  const up = rounded > 0;
  const color = flat ? 'text.disabled' : up ? 'success.main' : 'error.main';

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.25}
      sx={{ color, typography: 'caption', fontWeight: 600, flexShrink: 0 }}
      title="Change vs. 7 days ago"
    >
      {flat ? (
        <Box component="span" aria-hidden sx={{ width: 10, height: 2, mr: 0.5, bgcolor: 'currentColor' }} />
      ) : (
        <Iconify icon={up ? 'eva:trending-up-fill' : 'eva:trending-down-fill'} width={16} />
      )}
      <span>
        {up ? '+' : ''}
        {rounded}%
      </span>
    </Stack>
  );
}

// BNW OMS: the KPI tile at the top of every role dashboard (see bnw-overview-view.tsx) — a card
// with a faint tint of its colour, a tinted icon square, the big number and its label, then a
// supporting line and (when real history exists) a 7-day trend. Only facts the data has — no
// made-up trends. When `href` is given the whole tile links to the page where that number lives.
export function DashboardStatCard({
  icon,
  total,
  label,
  caption,
  trend,
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
          p: { xs: 2, md: 2.5 },
          height: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          textDecoration: 'none',
          color: 'text.primary',
          borderColor: varAlpha(theme.vars.palette[color].mainChannel, 0.16),
          backgroundImage: `linear-gradient(${varAlpha(theme.vars.palette[color].mainChannel, 0.04)}, ${varAlpha(theme.vars.palette[color].mainChannel, 0.04)})`,
          transition: theme.transitions.create(['box-shadow', 'border-color', 'transform']),
          ...(href && {
            '&:hover': {
              borderColor: varAlpha(theme.vars.palette[color].mainChannel, 0.36),
              boxShadow: `0 8px 20px ${varAlpha(theme.vars.palette.secondary.mainChannel, 0.08)}`,
              transform: 'translateY(-2px)',
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.vars.palette.primary.main}`,
              outlineOffset: 2,
            },
          }),
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:hover': { transform: 'none' },
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={(theme) => ({
            width: 48,
            height: 48,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1.5,
            color: `${color}.main`,
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.12),
          })}
        >
          <Iconify icon={icon} width={24} />
        </Box>

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="h3" component="div" sx={{ lineHeight: 1.2 }}>
            {total}
          </Typography>
          <Typography variant="subtitle2" noWrap title={label} sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
      </Stack>

      {/* The bottom line is always reserved, so every tile in a row has the same height. */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography
          variant="caption"
          noWrap
          component="div"
          title={caption}
          sx={{ color: 'text.secondary', minWidth: 0 }}
        >
          {caption || ' '}
        </Typography>
        {trend !== undefined && trend !== null && <TrendIndicator value={trend} />}
      </Stack>
    </Card>
  );
}
