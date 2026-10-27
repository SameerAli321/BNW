import { ForbiddenException } from '@nestjs/common';

/**
 * Sections that are switched off for now. Attendance Regularization stays greyed out until the
 * attendance system is integrated (client CEO, Oct 2026): existing forms can still be read, but
 * nothing new can be submitted, edited or decided. Flip to true to turn it back on — the
 * frontend has the matching switch in src/features.ts.
 */
export const FEATURES = {
  attendanceRegularization: false,
};

export function assertAttendanceRegularizationEnabled(): void {
  if (!FEATURES.attendanceRegularization) {
    throw new ForbiddenException(
      'Attendance regularization is switched off until the attendance system is integrated',
    );
  }
}
