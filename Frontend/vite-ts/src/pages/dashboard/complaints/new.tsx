import { CONFIG } from 'src/global-config';

import { ComplaintCreateView } from 'src/sections/complaint/view';

// ----------------------------------------------------------------------

const metadata = { title: `New complaint | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <ComplaintCreateView />
    </>
  );
}
