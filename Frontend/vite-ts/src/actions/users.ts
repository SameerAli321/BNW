import type { SWRConfiguration } from 'swr';
import type {
  UserDto,
  IDepartment,
  UpdateUserDto,
  CreateUserDto,
  IUserListMeta,
} from 'src/types/user';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Users module data layer, wired to the real backend per
// docs/API_CONTRACT_SPRINT1.md. Uses the template's existing SWR pattern (see src/actions/blog.ts)
// rather than introducing a new data-fetching library.

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export type UsersListFilters = {
  q?: string;
  role?: string;
  status?: string;
  departmentId?: number;
  page?: number;
  limit?: number;
};

type UsersListResponse = { data: UserDto[]; meta: IUserListMeta };

/** GET /users — HR/ADMIN only. */
export function useGetUsers(filters: UsersListFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  );

  const { data, isLoading, error, isValidating } = useSWR<UsersListResponse>(
    [endpoints.users.list, { params }],
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      users: data?.data || [],
      usersMeta: data?.meta,
      usersLoading: isLoading,
      usersError: error,
      usersValidating: isValidating,
      usersEmpty: !isLoading && !data?.data.length,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/** Revalidate every cached `useGetUsers` list (any filter combination) — call after create/update/delete. */
function revalidateUsersList() {
  return mutate((key) => Array.isArray(key) && key[0] === endpoints.users.list);
}

/** GET /users/:id */
export function useGetUser(userId?: number | string) {
  const url = userId ? endpoints.users.details(userId) : '';

  const { data, isLoading, error, isValidating } = useSWR<{ data: UserDto }>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      user: data?.data,
      userLoading: isLoading,
      userError: error,
      userValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/** GET /roles — any authenticated user. */
export function useGetRoles() {
  const { data, isLoading, error } = useSWR<{ data: { id: number; name: string }[] }>(
    endpoints.roles,
    fetcher,
    swrOptions
  );

  return { roles: data?.data || [], rolesLoading: isLoading, rolesError: error };
}

/** GET /departments — any authenticated user. */
export function useGetDepartments() {
  const { data, isLoading, error } = useSWR<{ data: IDepartment[] }>(
    endpoints.departments,
    fetcher,
    swrOptions
  );

  return { departments: data?.data || [], departmentsLoading: isLoading, departmentsError: error };
}

// ----------------------------------------------------------------------

/**
 * POST /users — HR/ADMIN only. No password field: the backend generates a temporary password
 * and (stub for now) emails/logs a "set your password" notice — see docs/API_CONTRACT_SPRINT1.md.
 */
export async function createUser(payload: CreateUserDto): Promise<UserDto> {
  const res = await axiosInstance.post(endpoints.users.list, payload);
  await revalidateUsersList();
  return res.data.data;
}

/** PATCH /users/:id — HR/ADMIN only, partial update. */
export async function updateUser(id: number | string, payload: UpdateUserDto): Promise<UserDto> {
  const res = await axiosInstance.patch(endpoints.users.details(id), payload);
  await Promise.all([revalidateUsersList(), mutate(endpoints.users.details(id))]);
  return res.data.data;
}

/** DELETE /users/:id — ADMIN only, soft delete (sets status = INACTIVE). */
export async function deleteUser(id: number | string): Promise<void> {
  await axiosInstance.delete(endpoints.users.details(id));
  await revalidateUsersList();
}

/**
 * POST /users/:id/reset-password — HR/ADMIN only. Generates a brand new temp password server-side
 * and returns it once so it can be shown/copied — it is never retrievable again after this call
 * (stored only as a hash). The user must change it on next login.
 */
export async function resetUserPassword(id: number | string): Promise<{ tempPassword: string }> {
  const res = await axiosInstance.post(endpoints.users.resetPassword(id));
  return res.data.data;
}
