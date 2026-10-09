import { CONFIG } from 'src/global-config';

import { NotificationsView } from 'src/sections/notification/notifications-view';

// ----------------------------------------------------------------------

const metadata = { title: `Notifications | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <NotificationsView />
    </>
  );
}
