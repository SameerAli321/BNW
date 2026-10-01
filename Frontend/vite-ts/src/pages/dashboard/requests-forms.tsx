import { CONFIG } from 'src/global-config';

import { RequestsFormsView } from 'src/sections/requests-forms/view';

// ----------------------------------------------------------------------

const metadata = { title: `Requests & Forms | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <RequestsFormsView />
    </>
  );
}
