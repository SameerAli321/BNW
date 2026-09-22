import type { UserDto } from 'src/types/user';

import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';

// ----------------------------------------------------------------------

export type SignInParams = {
  email: string;
  password: string;
};

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({ email, password }: SignInParams): Promise<void> => {
  try {
    const params = { email, password };

    // Contract: POST /auth/login -> { data: { accessToken, user } }, sets refreshToken cookie.
    const res = await axios.post(endpoints.auth.signIn, params);

    const { accessToken } = res.data.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    setSession(accessToken);
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
};

/** **************************************
 * Sign up
 *
 * NOTE: Self-registration is NOT part of the Sprint 1 contract — HR/Admin create users via
 * POST /users (temp password is emailed/logged, see the Users module). This function/endpoint
 * is a stub kept only so the template's existing demo sign-up page still compiles; it is not
 * reachable from the BNW OMS nav and will 404 until/unless a real backend route is added.
 *************************************** */
export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export const signUp = async ({
  email,
  password,
  firstName,
  lastName,
}: SignUpParams): Promise<void> => {
  const params = { email, password, firstName, lastName };

  try {
    const res = await axios.post(endpoints.auth.signUp, params);

    const { accessToken } = res.data.data ?? res.data;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    setSession(accessToken);
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  try {
    // Revokes the stored refresh token and clears the httpOnly cookie server-side.
    await axios.post(endpoints.auth.logout);
  } catch (error) {
    console.error('Error during sign out:', error);
  } finally {
    setSession(null);
  }
};

/** **************************************
 * Fetch current user (used by AuthGuard/AuthProvider when an access token is already held)
 *************************************** */
export const getMe = async (): Promise<UserDto> => {
  const res = await axios.get(endpoints.auth.me);
  return res.data.data.user;
};
