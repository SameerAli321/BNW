import { CONFIG } from 'src/global-config';

import { LeaveDetailView } from 'src/sections/leave/view';

// ----------------------------------------------------------------------

const metadata = { title: `Leave request | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LeaveDetailView />
    </>
  );
}
