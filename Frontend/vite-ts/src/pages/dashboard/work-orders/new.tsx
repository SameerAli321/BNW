import { CONFIG } from 'src/global-config';

import { WorkOrderCreateView } from 'src/sections/work-order/view';

// ----------------------------------------------------------------------

const metadata = { title: `New work order | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <WorkOrderCreateView />
    </>
  );
}
