import { CONFIG } from 'src/global-config';

import { SalaryCalculationView } from 'src/sections/salary-slip/view';

// ----------------------------------------------------------------------

const metadata = { title: `Salary calculation | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <SalaryCalculationView />
    </>
  );
}
