import type { LetterEventDto } from 'src/types/letter';

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
// Same Timeline pattern as src/sections/order/order-details-history.tsx — reused here for a
// letter's `events` audit trail (see docs/API_CONTRACT_SPRINT3.md, `letter_events`).

const ACTION_LABEL: Record<LetterEventDto['action'], string> = {
  SUBMITTED: 'Submitted to CEO',
  CHANGES_REQUESTED: 'Changes requested',
  CEO_SIGNED: 'Signed by CEO',
  SENT_TO_EMPLOYEE: 'Sent to employee',
  EMPLOYEE_SIGNED: 'Signed by employee',
  CANCELLED: 'Cancelled',
};

const ACTION_COLOR: Record<LetterEventDto['action'], 'primary' | 'error' | 'success' | 'grey'> = {
  SUBMITTED: 'primary',
  CHANGES_REQUESTED: 'error',
  CEO_SIGNED: 'success',
  SENT_TO_EMPLOYEE: 'primary',
  EMPLOYEE_SIGNED: 'success',
  CANCELLED: 'error',
};

type Props = {
  events: LetterEventDto[];
};

export function LetterTimeline({ events }: Props) {
  return (
    <Card>
      <CardHeader title="History" />

      <Box sx={{ p: 3 }}>
        {!events.length && (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            No events yet — this letter is still a draft.
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

                  {event.comment && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      &ldquo;{event.comment}&rdquo;
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
