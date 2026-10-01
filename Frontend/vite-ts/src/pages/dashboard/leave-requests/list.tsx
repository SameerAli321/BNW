import { CONFIG } from 'src/global-config';

import { LeaveListView } from 'src/sections/leave/view';

// ----------------------------------------------------------------------

const metadata = { title: `Leave & Holidays | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LeaveListView />
    </>
  );
}
