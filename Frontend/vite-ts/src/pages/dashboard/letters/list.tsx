import { CONFIG } from 'src/global-config';

import { LetterListView } from 'src/sections/letter/view';

// ----------------------------------------------------------------------

const metadata = { title: `Letters | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LetterListView />
    </>
  );
}
