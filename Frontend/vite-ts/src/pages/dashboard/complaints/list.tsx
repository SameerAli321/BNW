import { CONFIG } from 'src/global-config';

import { ComplaintListView } from 'src/sections/complaint/view';

// ----------------------------------------------------------------------

const metadata = { title: `Complaints | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <ComplaintListView />
    </>
  );
}
