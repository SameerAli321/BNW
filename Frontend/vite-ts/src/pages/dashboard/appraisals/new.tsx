import { CONFIG } from 'src/global-config';

import { AppraisalRequestFormView } from 'src/sections/appraisal/view';

// ----------------------------------------------------------------------

const metadata = { title: `Request appraisal | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AppraisalRequestFormView />
    </>
  );
}
