import { CONFIG } from 'src/global-config';

import { WorkOrderDetailView } from 'src/sections/work-order/view';

// ----------------------------------------------------------------------

const metadata = { title: `Work order | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <WorkOrderDetailView />
    </>
  );
}
