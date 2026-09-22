import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import axios, { endpoints } from 'src/lib/axios';

import { AuthContext } from '../auth-context';
import { setSession, isValidToken, getAccessToken } from './utils';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({ user: null, loading: true });

  const checkUserSession = useCallback(async () => {
    try {
      const currentToken = getAccessToken();

      if (currentToken && isValidToken(currentToken)) {
        // Already have a valid in-memory access token (e.g. right after login) — just fetch /me.
        const res = await axios.get(endpoints.auth.me);
        setState({ user: res.data.data.user, loading: false });
        return;
      }

      // No (or an expired) in-memory access token — likely a fresh page load. The access token
      // is never persisted (see jwt/utils.ts), so silently exchange the httpOnly refresh cookie
      // for a new one instead of forcing the user to log in again.
      const res = await axios.post(endpoints.auth.refresh);
      const { accessToken, user } = res.data.data;

      setSession(accessToken);
      setState({ user, loading: false });
    } catch (error) {
      console.error(error);
      setSession(null);
      setState({ user: null, loading: false });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
