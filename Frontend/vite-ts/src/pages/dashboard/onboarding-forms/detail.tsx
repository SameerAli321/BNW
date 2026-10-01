import { CONFIG } from 'src/global-config';

import { OnboardingFormDetailView } from 'src/sections/onboarding-form/view';

// ----------------------------------------------------------------------

const metadata = { title: `Onboarding Form | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <OnboardingFormDetailView />
    </>
  );
}
