import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { BookingEditView } from 'src/sections/booking/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit booking | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();
  return (
    <>
      <title>{metadata.title}</title>

      <BookingEditView id={id} />
    </>
  );
}
