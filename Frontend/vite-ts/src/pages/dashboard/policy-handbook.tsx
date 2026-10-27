import { CONFIG } from 'src/global-config';

import { PolicyHandbookView } from 'src/sections/company-about/policy-handbook-view';

// ----------------------------------------------------------------------

const metadata = { title: `Employee Policy Handbook | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <PolicyHandbookView />
    </>
  );
}
