import type { SWRConfiguration } from 'swr';
import type { EmployeeProfileDto, UpdateEmployeeProfileDto } from 'src/types/employee-profile';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Gap-fix data layer (Gap 1, `employee_profiles`), see
// docs/API_CONTRACT_GAPS_FIX.md. Same template SWR pattern as src/actions/users.ts.

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

/**
 * GET /users/:id/profile — HR, ADMIN, self, manager-of. Returns `{ data: EmployeeProfileDto |
 * null }` — `null` means the employee has never filled one in (not an error).
 */
export function useGetEmployeeProfile(userId?: number | string) {
  const url = userId ? endpoints.users.profile(userId) : '';

  const { data, isLoading, error, isValidating } = useSWR<{ data: EmployeeProfileDto | null }>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      profile: data?.data ?? null,
      profileLoading: isLoading,
      profileError: error,
      profileValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/**
 * PATCH /users/:id/profile — HR, ADMIN, or self. Upserts (creates the row on first write),
 * partial update semantics.
 */
export async function updateEmployeeProfile(
  id: number | string,
  payload: UpdateEmployeeProfileDto
): Promise<EmployeeProfileDto> {
  const res = await axiosInstance.patch(endpoints.users.profile(id), payload);
  await mutate(endpoints.users.profile(id));
  return res.data.data;
}
