import { CONFIG } from 'src/global-config';

import { CandidateListView } from 'src/sections/candidate/view';

// ----------------------------------------------------------------------

const metadata = { title: `Candidates | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <CandidateListView />
    </>
  );
}
