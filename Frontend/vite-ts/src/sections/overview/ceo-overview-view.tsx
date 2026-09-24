import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetLetters } from 'src/actions/letters';
import { useGetStaffSummary } from 'src/actions/employee-records';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';

import { DashboardStatCard } from './dashboard-stat-card';

// ----------------------------------------------------------------------

// BNW OMS: CEO dashboard home — letters awaiting the CEO's own review/signature, plus a
// one-window staff headcount snapshot (guide §3.1 U4 "Staff Database summary for CEO"). Built
// from the existing Sprint 2/3 endpoints, no new backend work.
export function CeoOverviewView() {
  const { letters, lettersMeta, lettersLoading } = useGetLetters({
    status: 'PENDING_CEO',
    limit: 5,
  });
  const { rowsMeta, rowsLoading } = useGetStaffSummary({ limit: 1 });

  return (
    <Stack spacing={3}>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <DashboardStatCard
            icon="solar:letter-unread-bold"
            total={lettersLoading ? '—' : (lettersMeta?.total ?? 0)}
            label="Letters awaiting your sign-off"
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <DashboardStatCard
            icon="solar:users-group-rounded-bold"
            total={rowsLoading ? '—' : (rowsMeta?.total ?? 0)}
            label="Employees company-wide"
            color="primary"
          />
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title="Letters awaiting your review"
          action={
            <Button component={RouterLink} href={paths.dashboard.letters.root} size="small">
              View all
            </Button>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {!lettersLoading && letters.length === 0 && (
            <EmptyContent
              title="Nothing pending"
              description="Letters HR submits for your review/signature will show up here."
              sx={{ py: 5 }}
            />
          )}
          <Stack spacing={2}>
            {letters.map((letter) => (
              <Stack
                key={letter.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                component={RouterLink}
                href={paths.dashboard.letters.details(letter.id)}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  textDecoration: 'none',
                  color: 'text.primary',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  transition: (theme) =>
                    theme.transitions.create(['background-color', 'box-shadow', 'transform']),
                  '&:hover': {
                    bgcolor: 'action.hover',
                    boxShadow: (theme) => theme.customShadows.z4,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <ListItemText
                  primary={`${letter.templateName} — ${letter.subjectName}`}
                  secondary={`Prepared by ${letter.preparedByName}`}
                />
                <Label color="info">Review</Label>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
