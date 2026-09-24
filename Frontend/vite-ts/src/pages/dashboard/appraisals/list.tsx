import { CONFIG } from 'src/global-config';

import { AppraisalListView } from 'src/sections/appraisal/view';

// ----------------------------------------------------------------------

const metadata = { title: `Appraisals | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AppraisalListView />
    </>
  );
}
