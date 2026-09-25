import { CONFIG } from 'src/global-config';

import { JoiningPackView } from 'src/sections/joining-pack/view';

// ----------------------------------------------------------------------

const metadata = { title: `Joining Pack | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <JoiningPackView />
    </>
  );
}
