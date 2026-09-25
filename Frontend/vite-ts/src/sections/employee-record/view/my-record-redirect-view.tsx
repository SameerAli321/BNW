import { Navigate } from 'react-router';

import { paths } from 'src/routes/paths';

import { LoadingScreen } from 'src/components/loading-screen';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/**
 * Stable sidebar target for "My E-record" (`paths.dashboard.myRecord`) — immediately redirects to
 * the logged-in user's own `employees/:id/record` page. Exists so the nav item's path doesn't need
 * to be computed per-user inside the static `navData` array.
 */
export function MyRecordRedirectView() {
  const { user } = useAuthContext();

  if (!user?.id) {
    return <LoadingScreen />;
  }

  return <Navigate to={paths.dashboard.employees.record(user.id)} replace />;
}
