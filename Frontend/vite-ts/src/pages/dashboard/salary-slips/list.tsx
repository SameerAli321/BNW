import { CONFIG } from 'src/global-config';

import { SalarySlipListView } from 'src/sections/salary-slip/view';

// ----------------------------------------------------------------------

const metadata = { title: `Salary slips | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <SalarySlipListView />
    </>
  );
}
