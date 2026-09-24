import type { CardProps } from '@mui/material/Card';
import type { IconifyName } from 'src/components/iconify';
import type { PaletteColorKey } from 'src/theme/core/palette';

import { varAlpha } from 'minimal-shared/utils';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  icon: IconifyName;
  total: number | string;
  label: string;
  color?: PaletteColorKey;
};

// BNW OMS: a small, reusable "number + icon" stat tile shared across the role-tailored dashboard
// home screens (Admin/CEO/Employee — see bnw-overview-view.tsx), so the dashboards read as
// polished stat cards instead of plain rows of numbers. No charts/trend lines (we don't have
// historical data to plot yet) — a soft colored icon badge is enough visual weight without
// needing fake data to fill a sparkline.
export function DashboardStatCard({ icon, total, label, color = 'primary', sx, ...other }: Props) {
  return (
    <Card
      sx={[
        (theme) => ({
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
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
          borderRadius: '50%',
          color: `${color}.dark`,
          bgcolor: (theme) => varAlpha(theme.vars.palette[color].mainChannel, 0.16),
        }}
      >
        <Iconify icon={icon} width={28} />
      </Stack>

      <Stack spacing={0.25}>
        <Typography variant="h3">{total}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Stack>
    </Card>
  );
}
