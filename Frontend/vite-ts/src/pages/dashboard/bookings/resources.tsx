import { CONFIG } from 'src/global-config';

import { BookingResourcesView } from 'src/sections/booking/view';

// ----------------------------------------------------------------------

const metadata = { title: `Rooms & tables | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <BookingResourcesView />
    </>
  );
}
