import { IsOptional, IsString } from 'class-validator';

export class SendToEmployeeDto {
  // Optional note from HR, shown to the employee alongside the letter (stored on the
  // SENT_TO_EMPLOYEE event, same "event.comment" pattern the timeline already renders for
  // CHANGES_REQUESTED).
  @IsOptional()
  @IsString()
  message?: string;
}
