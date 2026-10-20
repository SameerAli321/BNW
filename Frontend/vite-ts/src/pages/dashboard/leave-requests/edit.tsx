import { CONFIG } from 'src/global-config';

import { LeaveEditView } from 'src/sections/leave/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit leave request | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LeaveEditView />
    </>
  );
}
