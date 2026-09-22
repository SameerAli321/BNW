import { CONFIG } from 'src/global-config';

import { BnwOverviewView } from 'src/sections/overview/bnw-overview-view';

// ----------------------------------------------------------------------

const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function OverviewAppPage() {
  return (
    <>
      <title>{metadata.title}</title>

      <BnwOverviewView />
    </>
  );
}
