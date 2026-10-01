import { CONFIG } from 'src/global-config';

import { OnboardingFormMineView } from 'src/sections/onboarding-form/view';

// ----------------------------------------------------------------------

const metadata = { title: `Onboarding Form | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <OnboardingFormMineView />
    </>
  );
}
