import { CONFIG } from 'src/global-config';

import { GuideSheetView } from 'src/sections/company-about/guide-sheet-view';

// ----------------------------------------------------------------------

const metadata = { title: `Guide sheet | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <GuideSheetView />
    </>
  );
}
