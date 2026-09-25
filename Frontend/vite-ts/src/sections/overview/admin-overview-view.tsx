import { useMemo } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetUsers } from 'src/actions/users';
import { useGetLetterTemplates } from 'src/actions/letters';

import { Iconify } from 'src/components/iconify';

import { DashboardBarChart } from './dashboard-bar-chart';
import { DashboardStatCard } from './dashboard-stat-card';

// ----------------------------------------------------------------------

const ROLE_ORDER = ['EMPLOYEE', 'MANAGER', 'HR', 'CEO', 'PAYROLL', 'ADMIN'] as const;

// BNW OMS: Admin dashboard home. Counts are computed client-side from the existing `GET /users`
// list (same "fetch up to 200, no dedicated stats endpoint" approach the Sprint 1 Users list
// already uses) rather than adding a new backend aggregate endpoint for a handful of numbers.
export function AdminOverviewView() {
  // limit:200 matches the ceiling the Users list view already relies on for this dev-scale
  // dataset — see docs/FRONTEND_STATUS.md's Sprint 1 notes.
  const { users, usersLoading } = useGetUsers({ limit: 200 });
  const { templates, templatesLoading } = useGetLetterTemplates();

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((user) => counts.set(user.role, (counts.get(user.role) ?? 0) + 1));
    return counts;
  }, [users]);

  const roleChartData = useMemo(
    () => ROLE_ORDER.map((role) => ({ label: role, value: roleCounts.get(role) ?? 0 })),
    [roleCounts]
  );

  const activeCount = users.filter((user) => user.status === 'ACTIVE').length;
  const onboardingCount = users.filter((user) => user.status === 'ONBOARDING').length;
  const activeTemplatesCount = templates.filter((template) => template.isActive).length;

  if (usersLoading || templatesLoading) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Loading…
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DashboardStatCard
            icon="solar:users-group-rounded-bold"
            total={users.length}
            label="Total users"
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DashboardStatCard
            icon="solar:shield-check-bold"
            total={activeCount}
            label="Active"
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DashboardStatCard
            icon="solar:clock-circle-bold"
            total={onboardingCount}
            label="Onboarding"
            color="warning"
          />
        </Grid>
      </Grid>

      <DashboardBarChart
        title="Users by role"
        data={roleChartData}
        action={
          <Button component={RouterLink} href={paths.dashboard.user.list} size="small">
            Manage users
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Letter templates"
          action={
            <Button component={RouterLink} href={paths.dashboard.letterTemplates.root} size="small">
              Manage templates
            </Button>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                color: 'info.dark',
                bgcolor: 'info.lighter',
              }}
            >
              <Iconify icon="solar:file-text-bold" width={22} />
            </Stack>
            <Typography variant="body2">
              <strong>{templates.length}</strong> template{templates.length === 1 ? '' : 's'}{' '}
              configured (<strong>{activeTemplatesCount}</strong> active)
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
