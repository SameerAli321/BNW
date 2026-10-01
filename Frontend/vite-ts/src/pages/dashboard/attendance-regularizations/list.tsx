import { CONFIG } from 'src/global-config';

import { AttendanceRegularizationListView } from 'src/sections/attendance-regularization/view';

// ----------------------------------------------------------------------

const metadata = { title: `Attendance Regularization | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AttendanceRegularizationListView />
    </>
  );
}
