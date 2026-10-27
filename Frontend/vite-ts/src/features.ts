// ----------------------------------------------------------------------
// Sections switched off for now — mirrors Backend/src/common/features/feature-flags.ts.
// Attendance Regularization is greyed out until the attendance system is integrated (client CEO,
// Oct 2026): its card and pages show as unavailable and no action can be taken.

export const FEATURES = {
  attendanceRegularization: false,
};

export const ATTENDANCE_DISABLED_MESSAGE =
  'Available once the attendance system is integrated. No action can be taken here until then.';
