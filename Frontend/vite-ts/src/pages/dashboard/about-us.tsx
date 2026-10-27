import { CONFIG } from 'src/global-config';

import { AboutUsView } from 'src/sections/company-about/about-us-view';

// ----------------------------------------------------------------------

const metadata = { title: `What is BNW | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AboutUsView part="company" />
    </>
  );
}
