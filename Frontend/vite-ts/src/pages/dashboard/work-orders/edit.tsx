import { CONFIG } from 'src/global-config';

import { WorkOrderEditView } from 'src/sections/work-order/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit work order | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <WorkOrderEditView />
    </>
  );
}
