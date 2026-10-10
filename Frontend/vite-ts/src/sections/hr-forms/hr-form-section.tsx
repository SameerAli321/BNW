import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type SectionProps = {
  title: string;
  children: ReactNode;
};

/** One bordered block of an HR form, with a shaded title bar like the paper forms. */
export function HrFormSection({ title, children }: SectionProps) {
  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          py: 1.25,
          px: 2,
          textAlign: 'center',
          bgcolor: 'background.neutral',
          borderBottom: (theme) => `solid 1px ${theme.vars.palette.divider}`,
        }}
      >
        <Typography variant="subtitle2">{title}</Typography>
      </Box>
      <Stack spacing={2.5} sx={{ p: { xs: 2, md: 2.5 } }}>
        {children}
      </Stack>
    </Card>
  );
}

type FieldProps = {
  label: string;
  value?: ReactNode;
};

/** Read-only "Label: value" row. */
export function HrFormField({ label, value }: FieldProps) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }}>
      <Typography variant="subtitle2" sx={{ minWidth: { sm: 200 }, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: value ? 'text.primary' : 'text.disabled' }}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}
