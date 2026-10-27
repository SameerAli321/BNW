import { FEATURES } from 'src/features';
import { CONFIG } from 'src/global-config';

import { AttendanceRegularizationCreateView } from 'src/sections/attendance-regularization/view';
import { AttendanceRegularizationDisabled } from 'src/sections/attendance-regularization/attendance-regularization-disabled';

// ----------------------------------------------------------------------

const metadata = { title: `New attendance regularization | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      {FEATURES.attendanceRegularization ? (
        <AttendanceRegularizationCreateView />
      ) : (
        <AttendanceRegularizationDisabled />
      )}
    </>
  );
}
