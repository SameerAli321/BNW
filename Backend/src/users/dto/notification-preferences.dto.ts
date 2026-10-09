import { IsBoolean } from 'class-validator';

/** PATCH /users/me/notification-preferences */
export class NotificationPreferencesDto {
  @IsBoolean()
  notifyAllRequests: boolean;
}
