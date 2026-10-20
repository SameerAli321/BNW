import { CONFIG } from 'src/global-config';

import { ComplaintEditView } from 'src/sections/complaint/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit complaint | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <ComplaintEditView />
    </>
  );
}
