// NOTE: kept as a loose type (not `UserDto`) because the template's other auth strategies
// (amplify/firebase/supabase) populate `user` from provider-specific shapes that don't match
// `UserDto`, and this type is shared across all of them. The JWT strategy actually used by BNW
// OMS *does* populate `user` with the real `UserDto` (see docs/API_CONTRACT_SPRINT1.md and
// src/auth/context/jwt/auth-provider.tsx) — consumers in the Users module import `UserDto` from
// `src/types/user` directly and cast/narrow as needed.
export type UserType = Record<string, any> | null;

export type AuthState = {
  user: UserType;
  loading: boolean;
};

export type AuthContextValue = {
  user: UserType;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  checkUserSession?: () => Promise<void>;
};
