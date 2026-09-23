import type { LetterFieldSchemaEntry } from 'src/types/letter';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

// ----------------------------------------------------------------------
// Renders one input per manual field (`autoFilled === false`) from a template's `fieldsSchema`
// (see docs/API_CONTRACT_SPRINT3.md). Auto-filled fields (e.g. `employee.fullName`) aren't
// rendered here at all — they're resolved server-side from the subject's `UserDto` at render
// time, not stored in `fieldValues`, per the contract's `POST /letters` note. Plain controlled
// inputs rather than `react-hook-form` because the field set is dynamic (unknown key names at
// compile time) — same "keep it simple, templates are placeholder content this sprint" spirit as
// the template editor.

type Props = {
  fields: LetterFieldSchemaEntry[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
};

export function LetterManualFields({ fields, values, onChange, disabled }: Props) {
  const manualFields = fields.filter((field) => !field.autoFilled);

  if (!manualFields.length) {
    return null;
  }

  return (
    <Box
      sx={{
        rowGap: 3,
        columnGap: 2,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
      }}
    >
      {manualFields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={values[field.key] ?? ''}
          onChange={(event) => onChange(field.key, event.target.value)}
          disabled={disabled}
          fullWidth
        />
      ))}
    </Box>
  );
}
