import { CONFIG } from 'src/global-config';

import { LetterTemplateCreateView } from 'src/sections/letter-template/view';

// ----------------------------------------------------------------------

const metadata = { title: `New letter template | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LetterTemplateCreateView />
    </>
  );
}
