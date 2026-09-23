import { CONFIG } from 'src/global-config';

import { StaffSummaryListView } from 'src/sections/staff-summary/view';

// ----------------------------------------------------------------------

const metadata = { title: `Staff Summary | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <StaffSummaryListView />
    </>
  );
}
