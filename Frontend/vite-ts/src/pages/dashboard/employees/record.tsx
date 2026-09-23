import { CONFIG } from 'src/global-config';

import { EmployeeRecordView } from 'src/sections/employee-record/view';

// ----------------------------------------------------------------------

const metadata = { title: `Employee E-record | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <EmployeeRecordView />
    </>
  );
}
