import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — in-app notifications (the header bell). Mirrors Backend/src/notifications; always
// the signed-in user's own.

export interface NotificationDto {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null; // in-app path, e.g. /dashboard/leave-requests/12
  readAt: string | null;
  createdAt: string;
}

type NotificationsResponse = {
  data: NotificationDto[];
  meta: { total: number; unreadCount: number };
};

// Poll so new approvals / announcements show up without a page reload.
const swrOptions: SWRConfiguration = {
  refreshInterval: 60_000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

const revalidateNotifications = () =>
  mutate((key) => {
    const url = Array.isArray(key) ? key[0] : key;
    return typeof url === 'string' && url.startsWith(endpoints.notifications.list);
  });

export function useGetNotifications(opts: { limit?: number; unreadOnly?: boolean } = {}) {
  const params = { limit: opts.limit ?? 20, ...(opts.unreadOnly ? { unreadOnly: true } : {}) };
  const { data, isLoading } = useSWR<NotificationsResponse>(
    [endpoints.notifications.list, { params }],
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({
      notifications: data?.data || [],
      unreadCount: data?.meta.unreadCount ?? 0,
      notificationsLoading: isLoading,
    }),
    [data, isLoading]
  );
}

export async function markNotificationRead(id: number): Promise<void> {
  await axiosInstance.post(endpoints.notifications.read(id));
  await revalidateNotifications();
}

export async function markAllNotificationsRead(): Promise<void> {
  await axiosInstance.post(endpoints.notifications.readAll);
  await revalidateNotifications();
}

/** Icon + colour per notification type, so the list is scannable. */
export function notificationVisual(type: string): {
  icon:
    | 'solar:calendar-date-bold'
    | 'solar:chat-round-dots-bold'
    | 'solar:clock-circle-bold'
    | 'solar:user-plus-bold'
    | 'solar:bell-bing-bold'
    | 'solar:wad-of-money-bold'
    | 'solar:letter-bold';
  color: 'primary' | 'warning' | 'info' | 'success' | 'secondary' | 'error';
} {
  switch (type) {
    case 'LEAVE_REQUEST':
      return { icon: 'solar:calendar-date-bold', color: 'primary' };
    case 'COMPLAINT_SUBMITTED':
      return { icon: 'solar:chat-round-dots-bold', color: 'error' };
    case 'ATTENDANCE_REGULARIZATION':
      return { icon: 'solar:clock-circle-bold', color: 'info' };
    case 'ONBOARDING_FORM_SUBMITTED':
      return { icon: 'solar:user-plus-bold', color: 'success' };
    case 'ANNOUNCEMENT':
      return { icon: 'solar:bell-bing-bold', color: 'warning' };
    case 'WORK_ORDER':
      return { icon: 'solar:wad-of-money-bold', color: 'secondary' };
    case 'INTERVIEW':
      return { icon: 'solar:calendar-date-bold', color: 'info' };
    default:
      return { icon: 'solar:letter-bold', color: 'primary' };
  }
}
