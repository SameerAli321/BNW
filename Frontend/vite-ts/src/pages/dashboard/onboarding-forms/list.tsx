import { CONFIG } from 'src/global-config';

import { OnboardingFormListView } from 'src/sections/onboarding-form/view';

// ----------------------------------------------------------------------

const metadata = { title: `Onboarding Forms | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <OnboardingFormListView />
    </>
  );
}
