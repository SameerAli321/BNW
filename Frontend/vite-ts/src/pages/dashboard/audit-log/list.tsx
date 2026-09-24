import { CONFIG } from 'src/global-config';

import { AuditLogListView } from 'src/sections/audit-log/view';

// ----------------------------------------------------------------------

const metadata = { title: `Audit Log | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <AuditLogListView />
    </>
  );
}
