import axios from 'src/lib/axios';

// ----------------------------------------------------------------------

/**
 * Security note (per project guide): the access token is kept in memory only — never in
 * localStorage/sessionStorage — so it cannot be read by an XSS payload or survive as a stale
 * value across tabs. The refresh token lives in an httpOnly cookie set by the backend and is
 * never touched by JS. On a fresh page load there is no in-memory token, so the app relies on
 * a silent POST /auth/refresh (see auth-provider.tsx) to re-establish the session from that
 * cookie.
 */
let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

// ----------------------------------------------------------------------

export function jwtDecode(token: string) {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid token!');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export function isValidToken(accessToken: string) {
  if (!accessToken) {
    return false;
  }

  try {
    const decoded = jwtDecode(accessToken);

    if (!decoded || !('exp' in decoded)) {
      return false;
    }

    const currentTime = Date.now() / 1000;

    return decoded.exp > currentTime;
  } catch (error) {
    console.error('Error during token validation:', error);
    return false;
  }
}

// ----------------------------------------------------------------------

export function setSession(accessToken: string | null) {
  if (accessToken) {
    inMemoryAccessToken = accessToken;
    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  } else {
    inMemoryAccessToken = null;
    delete axios.defaults.headers.common.Authorization;
  }
}
