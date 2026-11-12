import type { StoryItem, StoryMilestone } from 'src/actions/about';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// Editors for the "What is BNW" story in the About us Edit dialog.

const PARAGRAPH_HINT = 'Leave a blank line between paragraphs.';

/** A long story text — a blank line starts a new paragraph on the page. */
export function StoryTextField({
  label,
  value,
  onChange,
  rows = 4,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  helperText?: string;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      multiline
      minRows={rows}
      fullWidth
      helperText={helperText ?? (rows > 2 ? PARAGRAPH_HINT : undefined)}
    />
  );
}

type Editable = StoryItem | StoryMilestone;

/**
 * A list of titled cards (services, firms, principles, expectations, timeline steps): edit, add,
 * remove and reorder. `withDate` adds the timeline's date field.
 */
export function StoryItemsField<T extends Editable>({
  label,
  itemLabel,
  items,
  onChange,
  withDate = false,
  textRows = 3,
  max = 20,
}: {
  label: string;
  itemLabel: string;
  items: T[];
  onChange: (items: T[]) => void;
  withDate?: boolean;
  textRows?: number;
  max?: number;
}) {
  const update = (index: number, patch: Partial<Editable>) =>
    onChange(items.map((item, i) => (i === index ? ({ ...item, ...patch } as T) : item)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };
  const add = () =>
    onChange([
      ...items,
      (withDate ? { date: '', title: '', text: '' } : { title: '', text: '' }) as T,
    ]);

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{label}</Typography>
      {items.map((item, index) => (
        <Card key={index} variant="outlined" sx={{ p: 2, boxShadow: 'none' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>
              {itemLabel} {index + 1}
            </Typography>
            <Tooltip title="Move up">
              <span>
                <IconButton size="small" disabled={index === 0} onClick={() => move(index, -1)}>
                  <Iconify icon="eva:arrow-upward-fill" width={18} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <Iconify icon="eva:arrow-downward-fill" width={18} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove">
              <IconButton
                size="small"
                color="error"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack spacing={1.5}>
            <Box
              sx={{
                gap: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: withDate ? '180px 1fr' : '1fr' },
              }}
            >
              {withDate && (
                <TextField
                  size="small"
                  label="Date"
                  placeholder="e.g. October 2015"
                  value={(item as StoryMilestone).date}
                  onChange={(e) => update(index, { date: e.target.value })}
                  slotProps={{ htmlInput: { maxLength: 60 } }}
                />
              )}
              <TextField
                size="small"
                label="Title"
                value={item.title}
                onChange={(e) => update(index, { title: e.target.value })}
                slotProps={{ htmlInput: { maxLength: 150 } }}
              />
            </Box>
            <TextField
              size="small"
              label="Text"
              value={item.text}
              onChange={(e) => update(index, { text: e.target.value })}
              multiline
              minRows={textRows}
              helperText={textRows > 2 ? PARAGRAPH_HINT : undefined}
            />
          </Stack>
        </Card>
      ))}
      {items.length < max && (
        <Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={add}
          >
            Add {itemLabel.toLowerCase()}
          </Button>
        </Box>
      )}
    </Stack>
  );
}
