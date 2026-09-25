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
import { useGetEmployeeRecord } from 'src/actions/employee-records';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';

import { DashboardStatCard } from './dashboard-stat-card';

// ----------------------------------------------------------------------

type Props = {
  userId: number;
};

// BNW OMS: the "User" (employee/manager/HR/payroll — anyone not Admin or CEO) dashboard home.
// Built entirely from data the existing Sprint 1-3 endpoints already return (no new backend
// work): letters waiting on this person's own signature, and a summary of their own E-record.
export function EmployeeOverviewView({ userId }: Props) {
  const { letters, lettersLoading } = useGetLetters({ status: 'SENT_TO_EMPLOYEE', limit: 5 });
  const { record, recordLoading } = useGetEmployeeRecord(userId);

  const documentCount = record?.documents.length ?? 0;
  const pendingRequestCount =
    record?.documentRequests.filter((request) => request.status === 'REQUESTED').length ?? 0;

  return (
    <Stack spacing={3}>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DashboardStatCard
            icon="solar:letter-unread-bold"
            total={lettersLoading ? '—' : letters.length}
            label="Letters waiting for your signature"
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DashboardStatCard
            icon="solar:add-folder-bold"
            total={recordLoading ? '—' : documentCount}
            label="Documents on file"
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DashboardStatCard
            icon="solar:import-bold"
            total={recordLoading ? '—' : pendingRequestCount}
            label="Documents requested from you"
            color="info"
          />
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title="Letters waiting for your signature"
          action={
            <Button component={RouterLink} href={paths.dashboard.letters.root} size="small">
              View all
            </Button>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {!lettersLoading && letters.length === 0 && (
            <EmptyContent
              title="Nothing to sign"
              description="Letters sent to you for e-signing will show up here."
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
                  primary={letter.templateName}
                  secondary={`Prepared by ${letter.preparedByName}`}
                />
                <Label color="warning">Sign now</Label>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
