import { CONFIG } from 'src/global-config';

import { WorkOrderListView } from 'src/sections/work-order/view';

// ----------------------------------------------------------------------

const metadata = { title: `Work orders | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <WorkOrderListView />
    </>
  );
}
