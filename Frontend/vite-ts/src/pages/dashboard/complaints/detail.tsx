import { CONFIG } from 'src/global-config';

import { ComplaintDetailView } from 'src/sections/complaint/view';

// ----------------------------------------------------------------------

const metadata = { title: `Complaint | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <ComplaintDetailView />
    </>
  );
}
