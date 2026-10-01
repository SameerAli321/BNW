import { CONFIG } from 'src/global-config';

import { AttendanceRegularizationDetailView } from 'src/sections/attendance-regularization/view';

// ----------------------------------------------------------------------

const metadata = { title: `Attendance regularization | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AttendanceRegularizationDetailView />
    </>
  );
}
