import type { LetterFieldSchemaEntry } from 'src/types/letter';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------
// Renders one input per field in a template's `fieldsSchema` (see docs/API_CONTRACT_SPRINT3.md).
// Manual fields are typed in. Auto-filled fields (e.g. `employee.designation`) come from the
// subject's employee record at render time — they're shown too so HR can type over them (e.g. a
// candidate's job title, which has no employee record yet); left blank, the record's value is used.
// Plain controlled inputs rather than `react-hook-form` because the field set is dynamic (unknown
// key names at compile time).

type Props = {
  fields: LetterFieldSchemaEntry[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
};

const grid = {
  rowGap: 3,
  columnGap: 2,
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
};

export function LetterManualFields({ fields, values, onChange, disabled }: Props) {
  const autoFields = fields.filter((field) => field.autoFilled);
  const manualFields = fields.filter((field) => !field.autoFilled);

  const renderField = (field: LetterFieldSchemaEntry) => (
    <TextField
      key={field.key}
      label={field.label}
      value={values[field.key] ?? ''}
      onChange={(event) => onChange(field.key, event.target.value)}
      disabled={disabled}
      fullWidth
      multiline={field.multiline}
      minRows={field.multiline ? 6 : undefined}
      placeholder={field.autoFilled ? 'From the employee record' : undefined}
      slotProps={field.autoFilled ? { inputLabel: { shrink: true } } : undefined}
      sx={field.multiline ? { gridColumn: '1 / -1' } : undefined}
    />
  );

  if (!fields.length) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {!!autoFields.length && (
        <Box>
          <Typography variant="subtitle2">Employee details</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Filled in from the employee record. Type in a box to use a different value on this
            letter — leave it blank to keep the record&apos;s value.
          </Typography>
          <Box sx={grid}>{autoFields.map(renderField)}</Box>
        </Box>
      )}

      {!!manualFields.length && (
        <Box>
          {!!autoFields.length && (
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Letter details
            </Typography>
          )}
          <Box sx={grid}>{manualFields.map(renderField)}</Box>
        </Box>
      )}
    </Box>
  );
}
