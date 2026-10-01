import { CONFIG } from 'src/global-config';

import { AttendanceRegularizationCreateView } from 'src/sections/attendance-regularization/view';

// ----------------------------------------------------------------------

const metadata = { title: `New attendance regularization | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AttendanceRegularizationCreateView />
    </>
  );
}
