import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IAuditLogTableFilters } from 'src/types/audit-log';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// BNW OMS — Gap-fix (Gap 2, `audit_logs`), see docs/API_CONTRACT_GAPS_FIX.md. Simple text-based
// entity/action filters — "cheap to add" is the explicit bar per the contract, no type-ahead.

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IAuditLogTableFilters>;
};

export function AuditLogTableToolbar({ filters, onResetPage }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterEntity = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ entity: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  const handleFilterAction = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ action: event.target.value });
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
      <TextField
        value={currentFilters.entity}
        onChange={handleFilterEntity}
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
        onChange={handleFilterAction}
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
    </Box>
  );
}
