import { CONFIG } from 'src/global-config';

import { AccountPersonalDetailsView } from 'src/sections/account/view';

// ----------------------------------------------------------------------

const metadata = { title: `Account personal details | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AccountPersonalDetailsView />
    </>
  );
}
