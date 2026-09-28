import { CONFIG } from 'src/global-config';

import { ActivityLogListView } from 'src/sections/activity-log/view';

// ----------------------------------------------------------------------

const metadata = { title: `Daily Activity | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <ActivityLogListView />
    </>
  );
}
