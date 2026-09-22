import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { useGetUser } from 'src/actions/users';

import { LoadingScreen } from 'src/components/loading-screen';

import { UserEditView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `User edit | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();

  const { user: currentUser, userLoading } = useGetUser(id);

  if (userLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <title>{metadata.title}</title>

      <UserEditView user={currentUser} />
    </>
  );
}
