import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Announcement board data layer. Mirrors Backend/src/announcements.

export type AnnouncementAudience = 'ALL' | 'DEPARTMENT';

export interface AnnouncementDto {
  id: number;
  title: string;
  body: string;
  postedBy: number | null;
  posterName: string | null;
  posterRole: string | null;
  audience: AnnouncementAudience;
  departmentId: number | null;
  departmentName: string | null;
  pinned: boolean;
  expiresOn: string | null; // YYYY-MM-DD, last day shown
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SaveAnnouncementDto = {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  departmentId?: number | null;
  pinned: boolean;
  expiresOn?: string | null;
};

/** Roles that can post / edit / delete announcements — matches the backend's @Roles. */
export const ANNOUNCEMENT_POSTER_ROLES = ['CEO', 'ADMIN', 'HR'];

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

/** GET /announcements — what's addressed to the caller, pinned first then newest. */
export function useGetAnnouncements(opts: { includeExpired?: boolean; limit?: number } = {}) {
  const params = {
    ...(opts.includeExpired ? { includeExpired: true } : {}),
    ...(opts.limit ? { limit: opts.limit } : {}),
  };
  const { data, isLoading } = useSWR<{ data: AnnouncementDto[] }>(
    [endpoints.announcements.list, { params }],
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({ announcements: data?.data || [], announcementsLoading: isLoading }),
    [data?.data, isLoading]
  );
}

function revalidateAnnouncements() {
  return mutate((key) => Array.isArray(key) && key[0] === endpoints.announcements.list);
}

/** POST /announcements — also notifies everyone it's addressed to (email is stubbed). */
export async function createAnnouncement(payload: SaveAnnouncementDto): Promise<AnnouncementDto> {
  const res = await axiosInstance.post(endpoints.announcements.list, payload);
  await revalidateAnnouncements();
  return res.data.data;
}

export async function updateAnnouncement(
  id: number,
  payload: Partial<SaveAnnouncementDto>
): Promise<AnnouncementDto> {
  const res = await axiosInstance.patch(endpoints.announcements.details(id), payload);
  await revalidateAnnouncements();
  return res.data.data;
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await axiosInstance.delete(endpoints.announcements.details(id));
  await revalidateAnnouncements();
}
