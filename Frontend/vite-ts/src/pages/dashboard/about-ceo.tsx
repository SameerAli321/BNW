import { CONFIG } from 'src/global-config';

import { AboutUsView } from 'src/sections/company-about/about-us-view';

// ----------------------------------------------------------------------

const metadata = { title: `CEO's Message | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AboutUsView part="ceo" />
    </>
  );
}
