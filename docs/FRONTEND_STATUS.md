# BNW OMS — Frontend Status (Sprint 0 + Sprint 1 vertical slice)

Tracks what's actually been built on the `Frontend/vite-ts` app against
`docs/API_CONTRACT_SPRINT1.md` and `BNW_OMS_Project_Guide (2) (1).md` §7/§9/§11. This file is the
frontend counterpart to `docs/PROJECT_STATUS.md`.

## How to run it

```bash
cd Frontend/vite-ts
npm install
npm run dev
```

Opens at **http://localhost:8080** (see `vite.config.ts` — the template's default dev port).
The app expects the backend at `http://localhost:5000/api/v1` (`.env` → `VITE_SERVER_URL`).

**Update — backend is now confirmed running.** Migrations + seed have been run successfully against
a live local Postgres (`docs/BACKEND_STATUS.md` has the details; DB credentials are `postgres`/
`postgres`, not the original `bnw`/`YOUR_DB_PASSWORD` — `docker-compose.yml` and `Backend/.env*`
were updated to match). A full manual click-through login → dashboard → Users CRUD round-trip
through this UI against that live backend has **not** been confirmed yet — do that next:

1. `docker compose up -d` (repo root) → Postgres `BNW` on `postgres`/`postgres`. Check nothing else
   already owns port 5432 first.
2. In `Backend/`: `npm run migration:run && npm run seed` (prints the seeded users' temp passwords
   to the console — see `docs/API_CONTRACT_SPRINT1.md` § Seed data), then `npm run start:dev`.
3. In `Frontend/vite-ts/`: `npm run dev`.
4. Open `http://localhost:8080` — the app now redirects `/` straight to the dashboard, which
   redirects to sign-in if not authenticated, so you land directly on the login screen (see
   "Nav/routing cleanup" below). Log in as `admin@bnw.local` with the temp password printed by the
   seed script.
5. Expected: lands on the dashboard shell (minimal-kit theme, demo widgets removed — see below),
   sidebar shows **Dashboard** and **Users** (Users only visible because `admin` has role `ADMIN`).
6. Go to Users → should list the 6 seeded users, support search/role/status filtering, and
   create/edit/delete against the real API.
7. Log out, log back in as `employee@bnw.local` → sidebar should **not** show Users (role
   `EMPLOYEE` is not `HR`/`ADMIN`); hitting `/dashboard/user/list` directly should render the
   guard's "Permission denied" content instead of the table.

## Nav/routing cleanup (post-initial-build)

Done after the initial Sprint 1 build, in response to explicit "remove the unnecessary stuff"
feedback — the template's demo/marketing chrome was still visible even though it wasn't wired to
real data:

- **`src/routes/sections/index.tsx`**: root path `/` now `<Navigate to={CONFIG.auth.redirectPath}>`
  instead of rendering the minimal-kit's marketing `HomePage`. `mainRoutes`, `authDemoRoutes`, and
  `componentsRoutes` are no longer mounted in the router at all (previously imported/spread in but
  unreachable from nav — now not routed, period). First thing anyone sees on load is the sign-in
  page (or the dashboard, if already authenticated).
- **`src/routes/sections/dashboard.tsx`**: rewritten from scratch — previously every demo route
  (Ecommerce, Analytics, Banking, Booking, File, Course, Product, Order, Invoice, Post, Job, Tour,
  File manager, Mail, Chat, Calendar, Kanban, Permission, Params, Subpaths, Blank, User
  Profile/Cards) was still mounted and directly visitable by URL even though hidden from the
  sidebar. Now only `dashboard` (index), `dashboard/user/{list,new,:id/edit}`, and
  `dashboard/user/account/{general,change-password}` are routed. The corresponding page/section
  files under `src/pages/` and `src/sections/` were **not deleted** — just unreferenced from
  routing — so they're still there if a later sprint wants the pattern.
- **`src/pages/dashboard/index.tsx`** + new **`src/sections/overview/bnw-overview-view.tsx`**: the
  dashboard home page no longer renders `OverviewAppView` (fake charts: downloads, invoices, "top
  authors," random countries, all from `src/_mock`). Replaced with a plain welcome card (real
  logged-in user's name, a shortcut to Users for HR/Admin). Real widgets get added per-module as
  later sprints build the data behind them.
- **`src/sections/account/account-layout.tsx`**: account settings tabs trimmed from
  General/Billing/Notifications/Social links/Security down to just **General** + **Security**
  (change password) — Billing/Notifications/Social links aren't part of this app and their routes
  are gone per the point above.
- **`src/layouts/dashboard/layout.tsx`**: removed the `WorkspacesPopover` ("Team 2 · Pro" team
  switcher, top-left of the header) and its `_workspaces` mock data import — demo multi-tenant UI,
  not applicable here.
- **`src/layouts/dashboard/nav-vertical.tsx` usage + `src/layouts/dashboard/nav-mobile.tsx`**:
  removed the `NavUpgrade` "Upgrade to Pro" card (fake avatar "Jaydon Frankie" /
  `demo@minimals.cc` / "Free" badge) from **both** places it was rendered — the desktop sidebar
  (via `slots={{ bottomArea: null }}` passed to `NavVertical` in `layout.tsx`) and the mobile nav
  drawer (`nav-mobile.tsx` had it hardcoded, unconditionally, separately from the desktop path —
  easy to miss, worth knowing about if another leftover "Upgrade to Pro"-style widget turns up
  elsewhere in the template).
- **Left alone for now** (flagged to the user, no decision made yet): the header's **Contacts
  popover** (fake contact list, `_mock`) and **Notifications bell** (fake notifications, `_mock`) —
  neither is backed by a real endpoint yet (`GET /notifications` etc. is a later sprint per the
  guide §9/§11), so they're currently either fake-data placeholders or candidates for removal until
  the real feature exists. Ask before touching.

## What's implemented / rewired

- **Env**: `.env` → `VITE_SERVER_URL=http://localhost:5000/api/v1`. All other provider env
  blocks (Firebase/Auth0/Supabase/AWS) left blank/untouched. `CONFIG.auth.method` in
  `src/global-config.ts` was already `'jwt'` — no change needed there.
- **Axios** (`src/lib/axios.ts`): `baseURL: CONFIG.serverUrl`, `withCredentials: true` (refresh
  cookie), a response interceptor that on a `401` from a non-`/auth/*` endpoint does exactly one
  silent `POST /auth/refresh` and retries the original request, and an `endpoints` map with the
  real paths (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/change-password`,
  `/users`, `/users/:id`, `/users/:id/reports`, `/roles`, `/departments`). The template's original
  demo endpoints (chat/kanban/calendar/mail/post/product) are kept as-is (unreachable from the
  BNW OMS nav, harmless if visited directly against the real backend — they'll just 404).
- **Auth flow** (`src/auth/context/jwt/`):
  - `utils.ts` — access token now held **in memory only** (module-level variable), not
    `sessionStorage`/`localStorage`, per the project guide's security note. `constant.ts`'s
    `JWT_STORAGE_KEY` is kept but unused/marked deprecated (in case leftover demo code imports it).
  - `action.ts` — `signInWithPassword` posts to `/auth/login`, reads
    `{ data: { accessToken, user } }`, stores the token in memory. `signOut` calls `/auth/logout`
    then clears the in-memory token. `signUp` is a stub only (see Deviations below).
  - `auth-provider.tsx` — `checkUserSession()`: if a valid in-memory access token exists, calls
    `GET /auth/me`; otherwise (fresh page load, no token in memory) silently calls
    `POST /auth/refresh` to exchange the httpOnly refresh cookie for a new access token + user.
    Either way, on failure the user is treated as logged out.
- **Types** (`src/types/user.ts`): `UserDto`, `CreateUserDto`, `UpdateUserDto`, `UserRole`,
  `UserAccountStatus`, `IDepartment` mirror `docs/API_CONTRACT_SPRINT1.md` exactly.
  `IUserItem = UserDto` is kept as an alias so the pre-existing Users demo UI (table/forms) didn't
  need a full rename. `src/auth/types.ts`'s shared `UserType` stays a loose
  `Record<string, any> | null` (see Deviations — it's shared with the other, unused, auth
  strategies) but the JWT strategy's `user` is always a real `UserDto` at runtime.
- **Role-based nav/guards**:
  - `src/layouts/nav-config-dashboard.tsx` trimmed to **Dashboard** + **Users**
    (`allowedRoles: ['HR', 'ADMIN']`) for this phase. All demo sections (Ecommerce, Product, Order,
    Invoice, Blog, Job, Tour, File manager, Mail, Chat, Calendar, Kanban, and the nav-demo "Misc"
    items) are commented out, not deleted, so the pattern is there for later sprints.
  - `src/layouts/dashboard/layout.tsx`, `account-drawer.tsx`, `account-popover.tsx` switched from
    the template's `useMockedUser()` to the real `useAuthContext()` so the header/account menu and
    the nav's role filtering reflect the actually logged-in user and role
    (`EMPLOYEE|MANAGER|HR|CEO|PAYROLL|ADMIN`), not the demo's `'admin'`/`'user'` roles.
    `nav-upgrade.tsx` (the decorative sidebar "Upgrade to Pro" footer) was **left** on
    `useMockedUser()` — purely cosmetic, out of scope.
  - `src/auth/guard/role-based-guard.tsx` unchanged (already generic on `currentRole`/
    `allowedRoles: string[]`) — the Users list/create/edit views now wrap themselves in
    `<RoleBasedGuard currentRole={user?.role} allowedRoles={['HR','ADMIN']} hasContent>` directly,
    since the router (`src/routes/sections/dashboard.tsx`) doesn't do per-route role guarding for
    any module in this template.
- **Users module** (`src/sections/user/`, `src/actions/users.ts`, `src/pages/dashboard/user/`):
  - `src/actions/users.ts` (new) — SWR hooks (`useGetUsers`, `useGetUser`, `useGetRoles`,
    `useGetDepartments`) plus `createUser`/`updateUser`/`deleteUser` axios calls, using the
    template's existing SWR pattern (see `src/actions/blog.ts`) — **no new data-fetching library**
    was introduced.
  - `user-table-row.tsx`, `user-table-toolbar.tsx` rewired to the real `UserDto` shape/columns
    (name, designation, department, manager, role, join date, status) and `USER_ROLE_OPTIONS`.
    The demo's "Quick edit" dialog (`user-quick-edit-form.tsx`) was **deleted** — it duplicated the
    full edit form against fields (`company`, `country`, `zipCode`, …) that don't exist on
    `UserDto`; the full edit page already covers every editable field via `PATCH /users/:id`.
  - `user-new-edit-form.tsx` rewritten: fields are `firstName`, `lastName`, `email`, `role`
    (select, 6 roles), `managerId` (select, populated from `GET /users`, excludes self),
    `departmentId` (select, populated from `GET /departments`), `designation`, `joinDate`. No
    password field — an info alert states the backend emails/logs a temp password.
  - `user-list-view.tsx` fetches from `GET /users` with `q`/`role`/`status` wired to the existing
    search box, role filter and status tabs; wrapped in `RoleBasedGuard`. Delete restricted in the
    UI to `ADMIN` (matches contract: `DELETE /users/:id` is ADMIN-only) — HR sees no delete
    action/checkbox-bulk-delete button.
  - `pages/dashboard/user/edit.tsx` now fetches the user via `useGetUser(id)` (real `GET
    /users/:id`) instead of looking it up in the old `_mock/_user.ts` array.
  - `pages/dashboard/user/list.tsx` and `new.tsx` unchanged (already just rendered the view
    components).

## Deviations from `docs/API_CONTRACT_SPRINT1.md` (and why)

None required changing the contract itself. Frontend-side simplifications, called out so the
backend agent isn't surprised:

- **Role filter is single-select on the wire.** The existing demo toolbar's role filter is a
  multi-select checkbox list (`role: string[]` in local UI state), but the contract's
  `GET /users?role=` query param is a single value. The frontend only sends
  `currentFilters.role[0]` (the first checked role) to the API; the UI still lets HR/Admin check
  multiple roles, but only the first is applied server-side until/unless the contract adds
  multi-value role filtering. Noted here rather than changing the contract, since this is a
  frontend UX simplification, not a backend requirement change.
- **Client-side column sort is visual only for now.** `TableHeadCustom`'s sort-by-column click
  updates local table state (`order`/`orderBy`) but the fetched page from `GET /users` isn't
  re-sorted client-side to match (the contract doesn't specify a `sort=` param). Low priority for
  a ≤6-seeded-user dev dataset; flag if the real user list grows large enough to need server-side
  sorting.
- **Self-registration (`/auth/register`) is not in the contract and is not implemented.** The
  template ships a demo JWT sign-up page/flow; per the guide, HR/Admin create users via
  `POST /users` (temp password emailed/logged), so there is no self-service sign-up in BNW OMS.
  The demo sign-up view/route/`signUp()` action were **left in place** (unreached from the BNW OMS
  nav) only so the codebase still compiles; calling it will 404 against the real backend. If this
  is a problem, the route can be deleted outright — ask before doing so since routes weren't in
  scope to remove.

## What demo content was left in place vs. hidden

- **Update**: most of the "hidden from nav only" content below was, after the nav/routing cleanup
  pass above, also removed from the router entirely (see that section) — it's no longer reachable
  by direct URL either, just still present as unreferenced files under `src/pages`/`src/sections`.
- **Hidden from nav only** (routes/pages still exist, untouched, just not linked):
  Ecommerce/Analytics/Banking/Booking/File/Course overview pages; Product, Order, Invoice, Blog,
  Job, Tour CRUD demos; File manager, Mail, Chat, Calendar, Kanban; the User "Profile"/"Cards"/
  "Account" demo pages (`src/sections/user/profile-*`, `user-card*`, `src/pages/dashboard/user/
  {profile,cards,account/*}`) — these still use the old mock `_userAbout`/`_userCards`/etc. data
  and were **not** rewired (out of scope for Sprint 1, which only covers the Users **list/create/
  edit** CRUD per the contract); the "Misc" nav-demo section (Level/Disabled/Label/Params/etc).
- **Left fully as-is** (demo/reference code, not on any BNW OMS nav path, not touched at all): the
  other auth strategies (`amplify`, `firebase`, `supabase`, `auth0` — dead code paths since
  `CONFIG.auth.method = 'jwt'`), `src/sections/_examples/*`, the theme, all other layouts.
- **Deleted** (not just hidden): `src/sections/user/user-quick-edit-form.tsx` — superseded by the
  rewired full edit form; kept out of the build entirely rather than left as dead/broken code
  referencing non-existent `UserDto` fields.

## Verification performed

- `npm run build` (`tsc && vite build`) — see command output for the actual run; this is a full
  project type-check (not scoped to just the Users module) plus a production Vite bundle.
- **Not verified**: end-to-end login against a live backend (backend not confirmed running at the
  time of this work — see "How to run it" above for the manual check once it is).
