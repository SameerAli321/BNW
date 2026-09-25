import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export type DashboardBarChartDatum = { label: string; value: number };

type Props = {
  title: string;
  data: DashboardBarChartDatum[];
  emptyLabel?: string;
  action?: ReactNode;
};

/**
 * A simple magnitude-by-category bar chart (e.g. "users by role", "letters by status"), built in
 * plain HTML/CSS per the dataviz skill rather than pulling in a charting library for a handful of
 * counts: single sequential hue (the job here is magnitude, not identity, so no categorical
 * palette is needed), thin rounded-end bars, a 2px track/fill gap, direct value labels (skips a
 * legend — the axis labels already name each category), and a hover tooltip on each bar.
 */
export function DashboardBarChart({ title, data, emptyLabel = 'No data yet', action }: Props) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader title={title} action={action} />
      <Stack spacing={2} sx={{ p: 3, pt: 2 }}>
        {!hasData && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
            {emptyLabel}
          </Typography>
        )}

        {hasData &&
          data.map((datum) => {
            const widthPct = Math.max(2, (datum.value / maxValue) * 100);
            return (
              <Stack key={datum.label} spacing={0.75}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {datum.label}
                  </Typography>
                  <Typography variant="subtitle2">{datum.value}</Typography>
                </Stack>

                <Tooltip title={`${datum.label}: ${datum.value}`} placement="top" arrow>
                  <Box
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: (theme) => theme.palette.action.hover,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: 1,
                        width: `${widthPct}%`,
                        borderRadius: 5,
                        bgcolor: 'primary.main',
                        transition: (theme) => theme.transitions.create('width'),
                      }}
                    />
                  </Box>
                </Tooltip>
              </Stack>
            );
          })}
      </Stack>
    </Card>
  );
}
