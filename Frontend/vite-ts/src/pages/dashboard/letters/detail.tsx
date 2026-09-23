import { CONFIG } from 'src/global-config';

import { LetterDetailView } from 'src/sections/letter/view';

// ----------------------------------------------------------------------

const metadata = { title: `Letter | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LetterDetailView />
    </>
  );
}
