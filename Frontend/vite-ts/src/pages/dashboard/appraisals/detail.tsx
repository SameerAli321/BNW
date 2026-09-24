import { CONFIG } from 'src/global-config';

import { AppraisalDetailView } from 'src/sections/appraisal/view';

// ----------------------------------------------------------------------

const metadata = { title: `Appraisal | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AppraisalDetailView />
    </>
  );
}
