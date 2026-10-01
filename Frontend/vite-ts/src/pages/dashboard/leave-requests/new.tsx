import { CONFIG } from 'src/global-config';

import { LeaveCreateView } from 'src/sections/leave/view';

// ----------------------------------------------------------------------

const metadata = { title: `Apply for leave | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LeaveCreateView />
    </>
  );
}
