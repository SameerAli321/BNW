import type { LetterFieldSchemaEntry } from 'src/types/letter';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// A simple repeatable key/label/autoFilled row editor for a template's `fieldsSchema` — per
// docs/API_CONTRACT_SPRINT3.md's scope cut #1, templates are placeholder content this sprint, so
// this doesn't need to be a fancy schema builder, just enough to define/edit the entries HR fills
// on letter creation.

type Props = {
  fields: LetterFieldSchemaEntry[];
  onChange: (fields: LetterFieldSchemaEntry[]) => void;
};

export function LetterTemplateFieldsEditor({ fields, onChange }: Props) {
  const handleAdd = () => {
    onChange([...fields, { key: '', label: '', autoFilled: false }]);
  };

  const handleRemove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, patch: Partial<LetterFieldSchemaEntry>) => {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Fields schema
      </Typography>

      {!fields.length && (
        <Typography variant="body2" sx={{ color: 'text.disabled', mb: 1.5 }}>
          No fields yet — add one below for every value this template needs (auto-filled from the
          employee record, or typed manually by HR when a letter is created).
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {fields.map((field, index) => (
          <Box
            key={index}
            sx={{
              gap: 1.5,
              display: 'flex',
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <TextField
              label="Key"
              placeholder="e.g. salary or employee.fullName"
              value={field.key}
              onChange={(event) => handleFieldChange(index, { key: event.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Label"
              placeholder="e.g. Monthly salary"
              value={field.label}
              onChange={(event) => handleFieldChange(index, { label: event.target.value })}
              fullWidth
              size="small"
            />
            <FormControlLabel
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              control={
                <Checkbox
                  checked={field.autoFilled}
                  onChange={(event) => handleFieldChange(index, { autoFilled: event.target.checked })}
                />
              }
              label="Auto-filled"
            />
            <IconButton color="error" onClick={() => handleRemove(index)}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Button
        size="small"
        onClick={handleAdd}
        startIcon={<Iconify icon="mingcute:add-line" />}
        sx={{ mt: 1.5 }}
      >
        Add field
      </Button>
    </Box>
  );
}
