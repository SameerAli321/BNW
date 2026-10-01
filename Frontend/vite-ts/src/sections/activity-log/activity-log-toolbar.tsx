import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ActivityLogFilters } from 'src/types/activity-log';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { formatPatterns } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { USER_ROLE_OPTIONS } from 'src/types/user';
import { ACTIVITY_CATEGORY_OPTIONS } from 'src/types/activity-log';

// ----------------------------------------------------------------------

type Props = {
  filters: UseSetStateReturn<ActivityLogFilters>;
  onResetPage: () => void;
  /** Name search — only meaningful on multi-person views. */
  showSearch: boolean;
  /** Role filter — only on "All Staff". */
  showRole: boolean;
};

export function ActivityLogToolbar({ filters, onResetPage, showSearch, showRole }: Props) {
  const { state: current, setState: update, resetState } = filters;

  const change = (patch: Partial<ActivityLogFilters>) => {
    onResetPage();
    update(patch);
  };

  const hasFilters = !!(
    current.from ||
    current.to ||
    current.category ||
    current.q ||
    current.role
  );

  return (
    <Box
      sx={{
        p: 2.5,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <DatePicker
        label="From"
        value={current.from ? dayjs(current.from) : null}
        onChange={(value) => change({ from: value?.isValid() ? value.format('YYYY-MM-DD') : '' })}
        format={formatPatterns.split.date}
        slotProps={{ textField: { sx: { width: { xs: 1, sm: 170 } } }, field: { clearable: true } }}
      />

      <DatePicker
        label="To"
        value={current.to ? dayjs(current.to) : null}
        onChange={(value) => change({ to: value?.isValid() ? value.format('YYYY-MM-DD') : '' })}
        format={formatPatterns.split.date}
        slotProps={{ textField: { sx: { width: { xs: 1, sm: 170 } } }, field: { clearable: true } }}
      />

      <TextField
        select
        label="Category"
        value={current.category}
        onChange={(event) => change({ category: event.target.value })}
        sx={{ width: { xs: 1, sm: 190 } }}
      >
        <MenuItem value="">All</MenuItem>
        {ACTIVITY_CATEGORY_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {showRole && (
        <TextField
          select
          label="Role"
          value={current.role}
          onChange={(event) => change({ role: event.target.value })}
          sx={{ width: { xs: 1, sm: 160 } }}
        >
          <MenuItem value="">All</MenuItem>
          {USER_ROLE_OPTIONS.map((role) => (
            <MenuItem key={role} value={role}>
              {role}
            </MenuItem>
          ))}
        </TextField>
      )}

      {showSearch && (
        <TextField
          value={current.q}
          onChange={(event) => change({ q: event.target.value })}
          placeholder="Search by name or email..."
          sx={{ flexGrow: 1, minWidth: { xs: 1, sm: 220 } }}
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
      )}

      {hasFilters && (
        <Button
          color="error"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          onClick={() => {
            onResetPage();
            resetState();
          }}
        >
          Clear
        </Button>
      )}
    </Box>
  );
}
