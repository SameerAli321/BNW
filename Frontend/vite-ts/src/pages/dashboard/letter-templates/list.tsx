import { CONFIG } from 'src/global-config';

import { LetterTemplateListView } from 'src/sections/letter-template/view';

// ----------------------------------------------------------------------

const metadata = { title: `Letter Templates | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LetterTemplateListView />
    </>
  );
}
