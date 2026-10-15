import { CONFIG } from 'src/global-config';

import { BookingCreateView } from 'src/sections/booking/view';

// ----------------------------------------------------------------------

const metadata = { title: `New booking | Dashboard - ${CONFIG.appName}` };

export default function Page() {

  return (
    <>
      <title>{metadata.title}</title>

      <BookingCreateView />
    </>
  );
}
