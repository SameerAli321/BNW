import type { AppraisalEventDto } from 'src/types/appraisal';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------
// Same @mui/lab Timeline pattern as src/sections/letter/letter-timeline.tsx (itself reused from
// src/sections/order/order-details-history.tsx) — an appraisal's `events` audit trail per
// docs/API_CONTRACT_SPRINT4.md's `appraisal_events` table.

const ACTION_LABEL: Record<AppraisalEventDto['action'], string> = {
  SUBMITTED: 'Submitted for review',
  MANAGER_ACCEPTED: 'Accepted by manager',
  MANAGER_REJECTED: 'Rejected by manager',
  CEO_ACCEPTED: 'Accepted by CEO',
  CEO_REJECTED: 'Rejected by CEO',
  CEO_SENT_BACK: 'Sent back to manager by CEO',
};

const ACTION_COLOR: Record<
  AppraisalEventDto['action'],
  'primary' | 'error' | 'success' | 'warning' | 'grey'
> = {
  SUBMITTED: 'primary',
  MANAGER_ACCEPTED: 'success',
  MANAGER_REJECTED: 'error',
  CEO_ACCEPTED: 'success',
  CEO_REJECTED: 'error',
  CEO_SENT_BACK: 'warning',
};

type Props = {
  events: AppraisalEventDto[];
};

export function AppraisalTimeline({ events }: Props) {
  return (
    <Card>
      <CardHeader title="History" />

      <Box sx={{ p: 3 }}>
        {!events.length && (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            No events yet.
          </Typography>
        )}

        {!!events.length && (
          <Timeline
            sx={{ p: 0, m: 0, [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 } }}
          >
            {events.map((event, index) => (
              <TimelineItem key={event.id}>
                <TimelineSeparator>
                  <TimelineDot color={ACTION_COLOR[event.action]} />
                  {index === events.length - 1 ? null : <TimelineConnector />}
                </TimelineSeparator>

                <TimelineContent>
                  <Typography variant="subtitle2">{ACTION_LABEL[event.action]}</Typography>

                  <Box sx={{ color: 'text.disabled', typography: 'caption', mt: 0.5 }}>
                    {event.actorName} · {fDateTime(event.createdAt)}
                  </Box>

                  {event.message && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      &ldquo;{event.message}&rdquo;
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Box>
    </Card>
  );
}
