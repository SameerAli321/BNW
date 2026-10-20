import { CONFIG } from 'src/global-config';

import { AttendanceRegularizationEditView } from 'src/sections/attendance-regularization/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit attendance regularization | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AttendanceRegularizationEditView />
    </>
  );
}
