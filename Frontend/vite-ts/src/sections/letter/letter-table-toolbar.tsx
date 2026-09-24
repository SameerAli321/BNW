import type { SelectChangeEvent } from '@mui/material/Select';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ILetterTableFilters } from 'src/types/letter';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';

import { LETTER_TYPE_OPTIONS, LETTER_STATUS_OPTIONS } from 'src/types/letter';

// ----------------------------------------------------------------------

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<ILetterTableFilters>;
};

export function LetterTableToolbar({ filters, onResetPage }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterType = useCallback(
    (event: SelectChangeEvent) => {
      onResetPage();
      updateFilters({ type: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  const handleFilterStatus = useCallback(
    (event: SelectChangeEvent) => {
      onResetPage();
      updateFilters({ status: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  return (
    <Box
      sx={{
        p: 2.5,
        gap: 2,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
      }}
    >
      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
        <InputLabel htmlFor="filter-letter-type-select">Type</InputLabel>
        <Select
          value={currentFilters.type}
          onChange={handleFilterType}
          input={<OutlinedInput label="Type" />}
          inputProps={{ id: 'filter-letter-type-select' }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
        >
          <MenuItem value="">All</MenuItem>
          {LETTER_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
        <InputLabel htmlFor="filter-letter-status-select">Status</InputLabel>
        <Select
          value={currentFilters.status}
          onChange={handleFilterStatus}
          input={<OutlinedInput label="Status" />}
          inputProps={{ id: 'filter-letter-status-select' }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
        >
          <MenuItem value="">All</MenuItem>
          {LETTER_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
