import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { UserDetailsView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `User details | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();

  return (
    <>
      <title>{metadata.title}</title>

      <UserDetailsView id={id} />
    </>
  );
}
