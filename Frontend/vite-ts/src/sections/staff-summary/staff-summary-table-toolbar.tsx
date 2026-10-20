import type { SelectChangeEvent } from '@mui/material/Select';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IDepartment } from 'src/types/user';
import type { IStaffSummaryTableFilters } from 'src/types/employee-record';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

import { userRoleLabel, USER_ACCOUNT_STATUS_OPTIONS } from 'src/types/user';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  ...USER_ACCOUNT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

type Option = { value: string; label: string };

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IStaffSummaryTableFilters>;
  options: {
    roles: readonly string[];
    departments: IDepartment[];
    employmentTypes: readonly Option[];
  };
};

export function StaffSummaryTableToolbar({ filters, options, onResetPage }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ name: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  // One handler for every select filter, keyed by the filter's name.
  const handleFilterSelect = useCallback(
    (key: 'role' | 'departmentId' | 'status' | 'employmentType') => (event: SelectChangeEvent) => {
      onResetPage();
      updateFilters({ [key]: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  return (
    <Box sx={{ p: 2.5, gap: 2, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          gap: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 180 } }}>
          <InputLabel htmlFor="filter-department-select">Department</InputLabel>
          <Select
            value={currentFilters.departmentId}
            onChange={handleFilterSelect('departmentId')}
            input={<OutlinedInput label="Department" />}
            inputProps={{ id: 'filter-department-select' }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
          >
            <MenuItem value="">All</MenuItem>
            {options.departments.map((department) => (
              <MenuItem key={department.id} value={String(department.id)}>
                {department.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 160 } }}>
          <InputLabel htmlFor="filter-role-select">Role</InputLabel>
          <Select
            value={currentFilters.role}
            onChange={handleFilterSelect('role')}
            input={<OutlinedInput label="Role" />}
            inputProps={{ id: 'filter-role-select' }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
          >
            <MenuItem value="">All</MenuItem>
            {options.roles.map((option) => (
              <MenuItem key={option} value={option}>
                {userRoleLabel(option)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 170 } }}>
          <InputLabel htmlFor="filter-employment-type-select">Employment type</InputLabel>
          <Select
            value={currentFilters.employmentType}
            onChange={handleFilterSelect('employmentType')}
            input={<OutlinedInput label="Employment type" />}
            inputProps={{ id: 'filter-employment-type-select' }}
          >
            <MenuItem value="">All</MenuItem>
            {options.employmentTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 140 } }}>
          <InputLabel htmlFor="filter-status-select">Status</InputLabel>
          <Select
            value={currentFilters.status}
            onChange={handleFilterSelect('status')}
            input={<OutlinedInput label="Status" />}
            inputProps={{ id: 'filter-status-select' }}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          value={currentFilters.name}
          onChange={handleFilterName}
          placeholder="Search name, email, employee code..."
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
      </Box>
    </Box>
  );
}
