import { CONFIG } from 'src/global-config';

import { LetterTemplateEditView } from 'src/sections/letter-template/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit letter template | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <LetterTemplateEditView />
    </>
  );
}
