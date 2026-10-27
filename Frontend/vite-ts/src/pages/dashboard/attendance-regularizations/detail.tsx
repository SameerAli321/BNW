import { FEATURES } from 'src/features';
import { CONFIG } from 'src/global-config';

import { AttendanceRegularizationDetailView } from 'src/sections/attendance-regularization/view';
import { AttendanceRegularizationDisabled } from 'src/sections/attendance-regularization/attendance-regularization-disabled';

// ----------------------------------------------------------------------

const metadata = { title: `Attendance regularization | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      {FEATURES.attendanceRegularization ? (
        <AttendanceRegularizationDetailView />
      ) : (
        <AttendanceRegularizationDisabled />
      )}
    </>
  );
}
