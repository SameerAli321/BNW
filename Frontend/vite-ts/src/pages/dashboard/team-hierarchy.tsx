import { CONFIG } from 'src/global-config';

import { TeamHierarchyView } from 'src/sections/team-hierarchy/view';

// ----------------------------------------------------------------------

const metadata = { title: `Team Hierarchy | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <TeamHierarchyView />
    </>
  );
}
