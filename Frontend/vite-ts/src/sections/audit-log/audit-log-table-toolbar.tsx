import type { Dayjs } from 'dayjs';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IAuditLogTableFilters } from 'src/types/audit-log';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { formatPatterns } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// BNW OMS — Gap-fix (Gap 2, `audit_logs`), see docs/API_CONTRACT_GAPS_FIX.md. Simple text-based
// entity/action filters — "cheap to add" is the explicit bar per the contract, no type-ahead —
// plus an inclusive From / To day range with a few quick presets.

const DAY = 'YYYY-MM-DD';

type DatePreset = { label: string; range: () => { from: string; to: string } };

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Today',
    range: () => ({ from: dayjs().format(DAY), to: dayjs().format(DAY) }),
  },
  {
    label: 'Last 7 days',
    range: () => ({ from: dayjs().subtract(6, 'day').format(DAY), to: dayjs().format(DAY) }),
  },
  {
    label: 'Last 30 days',
    range: () => ({ from: dayjs().subtract(29, 'day').format(DAY), to: dayjs().format(DAY) }),
  },
  {
    label: 'This month',
    range: () => ({ from: dayjs().startOf('month').format(DAY), to: dayjs().format(DAY) }),
  },
];

const toDay = (value: Dayjs | null) => (value?.isValid() ? value.format(DAY) : '');

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IAuditLogTableFilters>;
};

export function AuditLogTableToolbar({ filters, onResetPage }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const change = useCallback(
    (patch: Partial<IAuditLogTableFilters>) => {
      onResetPage();
      updateFilters(patch);
    },
    [onResetPage, updateFilters]
  );

  // Picking a From after the current To (or a To before From) moves the other end along, so the
  // range never runs backwards.
  const handleFrom = (value: Dayjs | null) => {
    const from = toDay(value);
    change(from && currentFilters.to && from > currentFilters.to ? { from, to: from } : { from });
  };

  const handleTo = (value: Dayjs | null) => {
    const to = toDay(value);
    change(to && currentFilters.from && to < currentFilters.from ? { to, from: to } : { to });
  };

  const hasDateRange = !!(currentFilters.from || currentFilters.to);

  const isPresetActive = (preset: DatePreset) => {
    const { from, to } = preset.range();
    return currentFilters.from === from && currentFilters.to === to;
  };

  return (
    <Box sx={{ p: 2.5, gap: 2, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          gap: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          value={currentFilters.entity}
          onChange={(event) => change({ entity: event.target.value })}
          placeholder="Filter by entity (e.g. User, Letter)..."
          sx={{ width: { xs: 1, md: 260 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          value={currentFilters.action}
          onChange={(event) => change({ action: event.target.value })}
          placeholder="Filter by action (e.g. LOGIN)..."
          sx={{ width: { xs: 1, md: 260 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <DatePicker
          label="From"
          value={currentFilters.from ? dayjs(currentFilters.from) : null}
          onChange={handleFrom}
          maxDate={currentFilters.to ? dayjs(currentFilters.to) : undefined}
          disableFuture
          format={formatPatterns.split.date}
          slotProps={{
            textField: { sx: { width: { xs: 1, sm: 170 } } },
            field: { clearable: true },
          }}
        />

        <DatePicker
          label="To"
          value={currentFilters.to ? dayjs(currentFilters.to) : null}
          onChange={handleTo}
          minDate={currentFilters.from ? dayjs(currentFilters.from) : undefined}
          disableFuture
          format={formatPatterns.split.date}
          slotProps={{
            textField: { sx: { width: { xs: 1, sm: 170 } } },
            field: { clearable: true },
          }}
        />
      </Box>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
        {DATE_PRESETS.map((preset) => {
          const active = isPresetActive(preset);
          return (
            <Chip
              key={preset.label}
              size="small"
              label={preset.label}
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => change(preset.range())}
            />
          );
        })}

        {hasDateRange && (
          <Button
            size="small"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => change({ from: '', to: '' })}
          >
            Clear dates
          </Button>
        )}
      </Stack>
    </Box>
  );
}
