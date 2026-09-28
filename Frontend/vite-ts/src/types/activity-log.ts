// ----------------------------------------------------------------------
// BNW OMS — Daily activity log types, mirroring docs/API_CONTRACT_ACTIVITY_LOG.md (guide §3.1 U3,
// §8.1 `daily_activity_logs`). Keep in sync with the contract.

export type ActivityCategory =
  | 'CLIENT_WORK'
  | 'INTERNAL'
  | 'MEETING'
  | 'TRAINING'
  | 'ADMINISTRATIVE'
  | 'OTHER';

export const ACTIVITY_CATEGORY_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: 'CLIENT_WORK', label: 'Client work' },
  { value: 'INTERNAL', label: 'Internal work' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'TRAINING', label: 'Training / CPD' },
  { value: 'ADMINISTRATIVE', label: 'Administrative' },
  { value: 'OTHER', label: 'Other' },
];

/** `ActivityLogDto` — one logged piece of work. `activityDate` is a plain 'YYYY-MM-DD'. */
export interface ActivityLogDto {
  id: number;
  userId: number;
  userName: string;
  userRole: string | null;
  activityDate: string;
  category: ActivityCategory;
  hours: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** `POST /activity-logs` body — always logged for the caller themself. */
export type CreateActivityLogDto = {
  activityDate: string;
  category: ActivityCategory;
  hours: number;
  description: string;
};

/** `PATCH /activity-logs/:id` body — owner only. */
export type UpdateActivityLogDto = Partial<CreateActivityLogDto>;

export type ActivityLogListMeta = {
  total: number;
  page: number;
  limit: number;
  totalHours: number;
};

export type ActivityLogFilters = {
  from: string;
  to: string;
  category: string;
  q: string;
  role: string;
};
