import { CONFIG } from 'src/global-config';

import { InternalNotesView } from 'src/sections/internal-note/view';

// ----------------------------------------------------------------------

const metadata = { title: `Notes for HR | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <InternalNotesView />
    </>
  );
}
