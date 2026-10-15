import { CONFIG } from 'src/global-config';

import { BookingListView } from 'src/sections/booking/view';

// ----------------------------------------------------------------------

const metadata = { title: `My bookings | Dashboard - ${CONFIG.appName}` };

export default function Page() {

  return (
    <>
      <title>{metadata.title}</title>

      <BookingListView />
    </>
  );
}
