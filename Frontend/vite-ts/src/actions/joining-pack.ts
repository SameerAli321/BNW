import type { SWRConfiguration } from 'swr';
import type {
  JoiningPackItemDto,
  CreateJoiningPackItemDto,
  UpdateJoiningPackItemDto,
} from 'src/types/candidate';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Sprint 5 data layer (Joining pack), wired to the real backend per
// docs/API_CONTRACT_SPRINT5.md. Same template SWR pattern as src/actions/candidates.ts.

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

/**
 * GET /joining-pack-items — any authenticated. Returns each active item plus
 * `acknowledged`/`acknowledgedAt` computed for the caller. Used both by the everyone-reachable
 * "acknowledge" view and (for HR/ADMIN) the manage screen, same list either way.
 */
export function useGetJoiningPackItems() {
  const { data, isLoading, error, isValidating } = useSWR<{ data: JoiningPackItemDto[] }>(
    endpoints.joiningPackItems.list,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      items: data?.data || [],
      itemsLoading: isLoading,
      itemsError: error,
      itemsValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

function revalidateItems() {
  return mutate(endpoints.joiningPackItems.list);
}

/** POST /joining-pack-items — HR, ADMIN. */
export async function createJoiningPackItem(
  payload: CreateJoiningPackItemDto
): Promise<JoiningPackItemDto> {
  const res = await axiosInstance.post(endpoints.joiningPackItems.list, payload);
  await revalidateItems();
  return res.data.data;
}

/** PATCH /joining-pack-items/:id — HR, ADMIN. Partial update, plus `isActive`. */
export async function updateJoiningPackItem(
  id: number | string,
  payload: UpdateJoiningPackItemDto
): Promise<JoiningPackItemDto> {
  const res = await axiosInstance.patch(endpoints.joiningPackItems.details(id), payload);
  await revalidateItems();
  return res.data.data;
}

/**
 * POST /joining-pack-items/:id/acknowledge — any authenticated. "I have read this." Idempotent —
 * re-acknowledging just returns the existing `acknowledgedAt` unchanged.
 */
export async function acknowledgeJoiningPackItem(id: number | string): Promise<void> {
  await axiosInstance.post(endpoints.joiningPackItems.acknowledge(id));
  await revalidateItems();
}
