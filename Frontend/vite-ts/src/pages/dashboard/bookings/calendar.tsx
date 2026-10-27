import { CONFIG } from 'src/global-config';

import { BookingCalendarView } from 'src/sections/booking/view';

// ----------------------------------------------------------------------

const metadata = { title: `Bookings | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <BookingCalendarView />
    </>
  );
}
