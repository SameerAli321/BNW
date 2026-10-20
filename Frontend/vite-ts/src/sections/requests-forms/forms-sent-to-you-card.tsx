import type { FormAssignmentDto } from 'src/actions/form-assignments';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { completeFormAssignment, useGetMyFormAssignments } from 'src/actions/form-assignments';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { dueDateInfo, FORM_ASSIGNMENT_ICON } from './form-assignment-utils';

// ----------------------------------------------------------------------

/**
 * "Forms sent to you" — the caller's PENDING form assignments (HR / Admin asked them to fill a form
 * in). Fill in opens the form's own page; Mark as done clears it once submitted. Renders nothing
 * while loading or when there are none.
 */
export function FormsSentToYouCard() {
  const { myFormAssignments, myFormAssignmentsLoading } = useGetMyFormAssignments('PENDING');

  if (myFormAssignmentsLoading || !myFormAssignments.length) return null;

  return (
    <Card
      sx={{
        mb: { xs: 3, md: 5 },
        border: (theme) => `solid 1px ${varAlpha(theme.vars.palette.warning.mainChannel, 0.32)}`,
      }}
    >
      <CardHeader
        title="Forms sent to you"
        subheader="HR asked you to fill these in. Submit the form, then mark it as done."
        avatar={
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'warning.main',
              bgcolor: (theme) => varAlpha(theme.vars.palette.warning.mainChannel, 0.12),
            }}
          >
            <Iconify icon="solar:inbox-bold" width={24} />
          </Box>
        }
        action={
          <Label color="warning" variant="soft">
            {myFormAssignments.length} pending
          </Label>
        }
        sx={{ mb: 1 }}
      />

      <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} sx={{ px: 3, pb: 1 }}>
        {myFormAssignments.map((assignment) => (
          <AssignmentRow key={assignment.id} assignment={assignment} />
        ))}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function AssignmentRow({ assignment }: { assignment: FormAssignmentDto }) {
  const [completing, setCompleting] = useState(false);
  const due = dueDateInfo(assignment.dueDate);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeFormAssignment(assignment.id);
      toast.success('Marked as done');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not update the form');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ sm: 'center' }}
      sx={{ py: 2 }}
    >
      <Iconify
        icon={FORM_ASSIGNMENT_ICON[assignment.formType]}
        width={28}
        sx={{ color: 'text.secondary', flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
      />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
          <Typography variant="subtitle2">{assignment.formLabel}</Typography>
          {due && (
            <Label color={due.color} variant="soft">
              {due.text}
            </Label>
          )}
        </Stack>
        {assignment.message && (
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
            {assignment.message}
          </Typography>
        )}
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.disabled' }}>
          Sent by {assignment.assignedByName ?? 'HR'} · {fToNow(assignment.createdAt)}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          loading={completing}
          onClick={handleComplete}
        >
          Mark as done
        </Button>
        <Button
          size="small"
          variant="contained"
          component={RouterLink}
          href={assignment.link}
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
        >
          Fill in
        </Button>
      </Stack>
    </Stack>
  );
}
