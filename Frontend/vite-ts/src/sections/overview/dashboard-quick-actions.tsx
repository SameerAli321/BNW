import type { IconifyName } from 'src/components/iconify';
import type { PaletteColorKey } from 'src/theme/core/palette';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { reducedMotionSx } from './dashboard-widgets';

// ----------------------------------------------------------------------

type QuickAction = {
  label: string;
  href: string;
  icon: IconifyName;
  color: PaletteColorKey;
  /** Same gating as the sidebar item / page button it shortcuts to; omitted = every role. */
  roles?: string[];
};

// Ordered by priority; the first four the role may use are shown. Gates mirror
// nav-config-dashboard.tsx `allowedRoles` and the in-page checks: Users = HR + ADMIN; letter
// create = HR + ADMIN (letter-list-view canCreate); Staff Summary ("View reports") = HR + CEO +
// ADMIN; Audit Log = CEO + ADMIN; Requests & Forms / Appraisals / Activity / Salary slips are
// open to everyone.
const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Add user',
    href: paths.dashboard.user.new,
    icon: 'solar:user-plus-bold',
    color: 'primary',
    roles: ['HR', 'ADMIN'],
  },
  {
    label: 'Create letter',
    href: paths.dashboard.letters.new,
    icon: 'solar:letter-bold',
    color: 'success',
    roles: ['HR', 'ADMIN'],
  },
  {
    label: 'Letters to review',
    href: paths.dashboard.letters.root,
    icon: 'solar:letter-unread-bold',
    color: 'warning',
    roles: ['CEO'],
  },
  {
    label: 'Apply for leave',
    href: paths.dashboard.leaveRequests.new,
    icon: 'solar:calendar-date-bold',
    color: 'primary',
    roles: ['EMPLOYEE', 'MANAGER', 'PAYROLL'],
  },
  {
    label: 'View reports',
    href: paths.dashboard.staffSummary,
    icon: 'solar:bill-list-bold',
    color: 'info',
    roles: ['HR', 'CEO', 'ADMIN'],
  },
  {
    label: 'Requests',
    href: paths.dashboard.requestsForms,
    icon: 'solar:file-check-bold-duotone',
    color: 'warning',
  },
  {
    label: 'Log work',
    href: paths.dashboard.activity,
    icon: 'solar:notebook-bold-duotone',
    color: 'info',
  },
  {
    label: 'Audit log',
    href: paths.dashboard.auditLog,
    icon: 'solar:shield-check-bold',
    color: 'secondary',
    roles: ['CEO', 'ADMIN'],
  },
  {
    label: 'Salary slips',
    href: paths.dashboard.salarySlips.root,
    icon: 'solar:wad-of-money-bold',
    color: 'success',
  },
];

/** Shortcut tiles to the pages this role uses most — only routes the role can open. */
export function DashboardQuickActions({ role }: { role?: string }) {
  const actions = QUICK_ACTIONS.filter(
    (a) => !a.roles || (!!role && a.roles.includes(role))
  ).slice(0, 4);

  return (
    <Card
      sx={{
        p: { xs: 2.5, md: 3 },
        height: 1,
        display: 'flex',
        gap: { xs: 2.5, md: 3 },
        alignItems: { md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0, minWidth: 0 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
          }}
        >
          <Iconify icon="solar:add-circle-bold" width={24} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">Quick actions</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Access common tasks quickly
          </Typography>
        </Box>
      </Stack>

      <Box
        component="nav"
        aria-label="Quick actions"
        sx={{
          flexGrow: 1,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
        }}
      >
        {actions.map((action) => (
          <Stack
            key={action.label}
            component={RouterLink}
            href={action.href}
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={(theme) => ({
              p: 1.5,
              minHeight: 92,
              borderRadius: 1.5,
              textAlign: 'center',
              textDecoration: 'none',
              color: 'text.primary',
              border: `1px solid ${theme.vars.palette.grey[200]}`,
              bgcolor: 'background.paper',
              transition: theme.transitions.create(['background-color', 'border-color']),
              '&:hover': {
                borderColor: varAlpha(theme.vars.palette[action.color].mainChannel, 0.36),
                bgcolor: varAlpha(theme.vars.palette[action.color].mainChannel, 0.04),
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.vars.palette.primary.main}`,
                outlineOffset: 2,
              },
              ...theme.applyStyles('dark', { borderColor: theme.vars.palette.divider }),
              ...reducedMotionSx,
            })}
          >
            <Box
              sx={(theme) => ({
                width: 40,
                height: 40,
                display: 'flex',
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center',
                color: `${action.color}.main`,
                bgcolor: varAlpha(theme.vars.palette[action.color].mainChannel, 0.12),
              })}
            >
              <Iconify icon={action.icon} width={22} />
            </Box>
            <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
              {action.label}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

/** The firm's tagline — a small card with a soft emerald tint. */
export function DashboardTagline() {
  return (
    <Card
      sx={(theme) => ({
        p: { xs: 2.5, md: 3 },
        height: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderColor: varAlpha(theme.vars.palette.success.mainChannel, 0.2),
        backgroundImage: `linear-gradient(115deg, ${varAlpha(theme.vars.palette.success.mainChannel, 0.1)}, ${varAlpha(theme.vars.palette.success.mainChannel, 0.03)})`,
      })}
    >
      <Box
        sx={(theme) => ({
          width: 48,
          height: 48,
          flexShrink: 0,
          display: 'flex',
          borderRadius: '50%',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'success.main',
          bgcolor: 'background.paper',
          boxShadow: `0 0 0 4px ${varAlpha(theme.vars.palette.success.mainChannel, 0.12)}`,
        })}
      >
        <Iconify icon="solar:verified-check-bold" width={26} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1">
          Better Numbers.
          <br />
          Better Decisions.
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          BNW Chartered Accountants
        </Typography>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

/** Quick actions (wide) + tagline (narrow) — one row on md+, stacked on phones / tablets. */
export function DashboardQuickActionsRow({ role }: { role?: string }) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8, lg: 9 }}>
        <DashboardQuickActions role={role} />
      </Grid>
      <Grid size={{ xs: 12, md: 4, lg: 3 }}>
        <DashboardTagline />
      </Grid>
    </Grid>
  );
}
