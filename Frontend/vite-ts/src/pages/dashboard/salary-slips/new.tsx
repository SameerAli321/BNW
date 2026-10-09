import { CONFIG } from 'src/global-config';

import { SalarySlipGenerateView } from 'src/sections/salary-slip/view';

// ----------------------------------------------------------------------

const metadata = { title: `Generate salary slip | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <SalarySlipGenerateView />
    </>
  );
}
