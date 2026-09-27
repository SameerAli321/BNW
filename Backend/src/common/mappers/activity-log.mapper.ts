import { DailyActivityLog } from '../../entities/daily-activity-log.entity';

export interface ActivityLogDto {
  id: number;
  userId: number;
  userName: string;
  userRole: string | null;
  activityDate: string;
  category: string;
  hours: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** Requires the `user` relation to be loaded. */
export function toActivityLogDto(log: DailyActivityLog): ActivityLogDto {
  return {
    id: log.id,
    userId: log.userId,
    userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : '',
    userRole: log.user ? log.user.role : null,
    activityDate: log.activityDate,
    category: log.category,
    hours: log.hours,
    description: log.description,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}
