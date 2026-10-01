import { CONFIG } from 'src/global-config';

import { AnnouncementsView } from 'src/sections/announcement/view';

// ----------------------------------------------------------------------

const metadata = { title: `Announcements | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AnnouncementsView />
    </>
  );
}
