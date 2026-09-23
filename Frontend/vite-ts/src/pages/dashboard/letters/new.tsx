import { CONFIG } from 'src/global-config';

import { LetterCreateView } from 'src/sections/letter/view';

// ----------------------------------------------------------------------

const metadata = { title: `New letter | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LetterCreateView />
    </>
  );
}
