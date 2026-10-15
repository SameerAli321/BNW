import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { BookingDetailsView } from 'src/sections/booking/view';

// ----------------------------------------------------------------------

const metadata = { title: `Booking | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();
  return (
    <>
      <title>{metadata.title}</title>

      <BookingDetailsView id={id} />
    </>
  );
}
