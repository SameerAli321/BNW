import { CONFIG } from 'src/global-config';

import { MyRecordRedirectView } from 'src/sections/employee-record/view';

// ----------------------------------------------------------------------

const metadata = { title: `My E-record | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <MyRecordRedirectView />
    </>
  );
}
