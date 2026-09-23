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

---

# Sprint 2 — E-record & Staff Summary

Tracks what's been built against `docs/API_CONTRACT_SPRINT2.md` (U4 Staff Database summary, U5
Employee E-record). Builds on the Sprint 0/1 slice above — nothing from that section was touched
except the additive nav/routing/account-layout changes noted below.

## What's implemented

- **Types** (`src/types/employee-record.ts`, new): `DocumentTypeDto`, `EmployeeDocumentDto`,
  `DocumentRequestDto`, `StaffSummaryRowDto`, plus an `EmployeeRecordDto` (the `GET
  /employees/:id/record` response shape) and small filter/meta helper types — mirrors the
  contract's DTOs field-for-field. Companion file to `src/types/user.ts`, not merged into it, to
  keep the Sprint 1 file untouched.
- **Endpoints** (`src/lib/axios.ts`): added `staffSummary.{list,export}`, `employees.{record,
  documents,documentRequests}`, `documents.download`, `documentTypes` to the existing `endpoints`
  map. No changes to the axios instance, interceptor, or auth wiring.
- **Data layer** (`src/actions/employee-records.ts`, new): `useGetStaffSummary`,
  `exportStaffSummaryCsv`, `useGetDocumentTypes`, `useGetEmployeeRecord`, `uploadEmployeeDocument`,
  `createDocumentRequest`, `downloadDocument` — same template SWR pattern as
  `src/actions/users.ts` (Sprint 1). The two "streamed file" endpoints
  (`/staff-summary/export`, `/documents/:id/download`) are plain `axiosInstance` calls with
  `responseType: 'blob'`, not SWR/`fetcher` calls (they're not JSON), and hand off to a new small
  shared helper, `src/utils/download-blob.ts` (`downloadBlob(blob, filename)` — creates an object
  URL and clicks a throwaway `<a download>`). No existing download-file utility was found under
  `src/components/file-thumbnail` or `src/sections/file-manager` (that section is demo-only/unwired
  per the Sprint 1 notes above), so this is a new small helper rather than a new dependency.
- **Staff Summary** (`src/sections/staff-summary/`, `src/pages/dashboard/staff-summary/list.tsx`,
  route `/dashboard/staff-summary`): HR/CEO/ADMIN only (`RoleBasedGuard`, same pattern as the Users
  list). Table follows the Users list's MUI table components (`TableHeadCustom`,
  `TablePaginationCustom`, `Scrollbar`, etc. from `src/components/table`), **not** a new
  `@mui/x-data-grid` table — the codebase doesn't use that package anywhere (checked
  `user-list-view.tsx` and `package.json`), so matching the established pattern seemed more in the
  spirit of "looks like the same person wrote it" than introducing a new grid library.
  - Search box + Department/Role/Status selects wired to `q`/`departmentId`/`role`/`status` query
    params (Status as a `Select`, not the Users list's `Tabs` strip — a status tab bar would need a
    per-status count, which would mean either an extra unfiltered fetch or trusting stale counts
    against a server-paginated list, so a plain select was used instead).
  - **Server-side pagination**, unlike the Sprint 1 Users list (which fetches up to 200 rows and
    paginates client-side): `GET /staff-summary` is meant for the full headcount, so `page`/`limit`
    are sent as query params and `meta.total` drives `TablePaginationCustom`'s count, rather than
    slicing a locally-fetched array.
  - "Export CSV" button calls `exportStaffSummaryCsv` with the current filters (minus
    page/limit, since export is unpaginated per the contract) and triggers a browser download of
    `staff-summary.csv`.
  - Each row's name/"View record" link goes to `/dashboard/employees/:id/record`.
- **Employee E-record** (`src/sections/employee-record/`,
  `src/pages/dashboard/employees/record.tsx`, route `/dashboard/employees/:id/record`):
  - Basic info card (name, email, employee code, role, designation, department, manager, status,
    join date) from `record.user` (`UserDto`, reused from Sprint 1 — no duplicate user-shape type).
  - Documents table (`EmployeeDocumentTable`): type, file name + size (`fData`), source badge,
    uploaded-by, uploaded-on, and a download icon button per row that calls `downloadDocument`.
  - Document requests table (`EmployeeDocumentRequestTable`): type, status badge, due date,
    requested-on. Renders nothing (not even an empty-state card) when there are no requests, to
    keep an employee's record page uncluttered until requests exist.
  - HR/ADMIN only: "Upload document" and "Request document" buttons in the page header open
    dialogs (`EmployeeDocumentUploadDialog`, `EmployeeDocumentRequestDialog`) built with the same
    `react-hook-form` + `zod` + `Form`/`Field.*` pattern as `user-new-edit-form.tsx`. The upload
    dialog uses `Field.Upload` (`src/components/hook-form/rhf-upload.tsx`, already in the
    template, previously only used for avatar images) with an explicit `accept` map overriding its
    image-only default, matching the contract's allowed mime list, and `maxSize` at the contract's
    10MB cap.
  - Anyone else (including the employee viewing their own record) sees the same two tables
    read-only, no upload/request controls — gated on `currentRole` being `HR`/`ADMIN`, independent
    of whose record is being viewed.
  - **Access guard**: reuses `RoleBasedGuard` (same component the Users module uses), but since
    "self" and "manager-of" aren't role checks, the page computes its own boolean (HR/ADMIN/CEO, or
    `id === currentUser.id`, or role `MANAGER`) and feeds it into `RoleBasedGuard` as a synthetic
    two-value role/allow-list pair. `MANAGER` is let through client-side unconditionally (whether
    *this* manager is *this* employee's manager can only be confirmed by the backend) — if the
    fetch then 403s, the page shows an inline "unable to load / no permission" message instead of
    the tables. See Deviations below for why this can't be tightened further from the frontend
    alone.
- **Nav**: `src/layouts/nav-config-dashboard.tsx` — added a "Staff Summary" item (`ic-folder` icon)
  under the existing "Management" section, `allowedRoles: ['HR', 'CEO', 'ADMIN']`, same
  `allowedRoles` pattern as "Users". The E-record page has no nav entry of its own, per the task
  (reached via a Staff Summary row or the account area link below).
- **Own-account entry point**: `src/sections/account/account-layout.tsx` — added a "My E-record"
  button next to the Account page's breadcrumbs (`CustomBreadcrumbs`'s `action` slot, same slot the
  Users list uses for its "New user" button), linking to
  `paths.dashboard.employees.record(currentUser.id)`. Not added as a third `<Tabs>` entry alongside
  General/Security, since it navigates to a different route/layout entirely rather than another tab
  within `AccountLayout`. This is the only change to a Sprint-1-owned file besides the nav config
  and route table.
- **Routing** (`src/routes/sections/dashboard.tsx`): added `staff-summary` and `employees/:id/record`
  as lazy-loaded routes alongside the existing trimmed set — no demo routes reintroduced.

## Deviations from `docs/API_CONTRACT_SPRINT2.md` (and why)

No changes to the contract itself. Frontend-side notes for the backend agent:

- **`GET /staff-summary`'s `page` param is sent 1-based** (`table.page + 1`, since the template's
  `useTable` hook is 0-based internally). If the backend implements `page` as 0-based, the first
  page of results will be requested as `page=1` instead of `page=0` — an easy off-by-one to hit
  when both sides are built in parallel. Flagging here rather than guessing; align with whatever
  `docs/BACKEND_STATUS.md` says once Sprint 2's backend is confirmed, and adjust the `+ 1` in
  `staff-summary-list-view.tsx` if needed.
- **"Manager-of" isn't verified client-side.** The contract allows a manager to view their direct
  reports' E-records, but the frontend has no cheap way to know "is the current user this
  employee's manager" before fetching the record (that's exactly what the record itself would
  tell us, chicken-and-egg). Any authenticated `MANAGER` is allowed to *attempt* the
  `/employees/:id/record` fetch; the backend's own authorization is the real gate. If the backend
  403s, the page shows a generic "unable to load / no permission" message rather than a precise
  "you're not their manager" — acceptable for Sprint 2's scope but worth knowing if a nicer error
  message becomes a requirement later (would need the backend to return a distinguishable
  403-vs-404 body, since the shared axios interceptor currently collapses all error responses to
  a bare `Error(message)` — see `src/lib/axios.ts`'s response interceptor).
- **No `@mui/x-data-grid`.** The task suggested reusing "the existing `@mui/x-data-grid` or the
  template's custom table pattern"; the codebase doesn't have `@mui/x-data-grid` installed or used
  anywhere (confirmed against `package.json` and `user-list-view.tsx`), so Staff Summary reuses the
  template's custom table components instead, consistent with the rest of the app.

## Verification performed

- `npx tsc --noEmit` — clean, zero errors.
- `npm run build` (`tsc && vite build`) — clean, zero errors and zero lint warnings (the build's
  eslint pass, same as Sprint 1's bar). Only pre-existing, unrelated warnings remain (the
  template's large main-bundle chunk-size notice — present before this sprint's changes too).
- **Not verified against a live backend.** No backend was running on `localhost:5000` at the time
  of this work (checked `GET /api/v1/document-types`, got no response) — the backend agent's
  Sprint 2 work (`Backend/src/employees/`, `Backend/src/staff-summary/`, new entities/migrations)
  was present in the working tree but not confirmed running/migrated. Once it is, the manual
  click-through to do (mirrors the Sprint 1 checklist above):
  1. Log in as `hr@bnw.local` (or any HR/CEO/ADMIN seed user) → sidebar should show "Staff
     Summary" between "Dashboard" and the Users section.
  2. Staff Summary → table loads, search/department/role filters narrow results, pagination works,
     "Export CSV" downloads a `staff-summary.csv` file.
  3. Click a row → lands on `/dashboard/employees/:id/record`, shows basic info + (initially empty)
     documents/requests, "Upload document" and "Request document" buttons visible (HR/ADMIN).
  4. Upload a document (pick a type, attach a PDF/image) → appears in the documents table; click
     its download icon → file downloads with its original name.
  5. Request a document → appears in the document requests table with status `REQUESTED`.
  6. Log out, log in as `employee@bnw.local` → sidebar has no "Staff Summary" item; hitting
     `/dashboard/staff-summary` directly renders "Permission denied"; Account page shows a "My
     E-record" button → own record is visible read-only (no upload/request buttons); hitting
     another employee's `/dashboard/employees/:id/record` directly should 403 from the backend
     (frontend shows the "unable to load / no permission" message).

---

# Sprint 3 — Letter engine

Tracks what's been built against `docs/API_CONTRACT_SPRINT3.md` (letter templates, letter
lifecycle DRAFT → PENDING_CEO → CEO_SIGNED → SENT_TO_EMPLOYEE → SIGNED, in-app CEO/employee
signing). Builds on the Sprint 0/1/2 slices above — nothing from those sections was touched except
the additive nav/routing changes noted below.

## What's implemented

- **Types** (`src/types/letter.ts`, new): `LetterFieldSchemaEntry`, `LetterTemplateDto`,
  `LetterEventDto`, `SignatureDto`, `LetterDto` mirror the contract's DTOs field-for-field, plus
  `CreateLetterTemplateDto`/`UpdateLetterTemplateDto`/`CreateLetterDto`/`UpdateLetterDto` request
  shapes and `LETTER_TYPE_OPTIONS`/`LETTER_STATUS_OPTIONS` constant arrays (same pattern as
  `USER_ROLE_OPTIONS` in `src/types/user.ts`). Companion file to `src/types/user.ts` and
  `src/types/employee-record.ts`, not merged into either.
- **Endpoints** (`src/lib/axios.ts`): added `letterTemplates.{list,details,fields}` and
  `letters.{list,details,preview,submitToCeo,requestChanges,ceoSign,sendToEmployee,employeeSign,pdf}`
  to the existing `endpoints` map. No changes to the axios instance, interceptor, or auth wiring.
- **Data layer** (`src/actions/letters.ts`, new): `useGetLetterTemplates`, `useGetLetterTemplate`,
  `useGetLetterTemplateFields`, `createLetterTemplate`, `updateLetterTemplate`, `useGetLetters`,
  `useGetLetter`, `createLetter`, `updateLetter`, `previewLetter`, `submitLetterToCeo`,
  `requestLetterChanges`, `ceoSignLetter`, `sendLetterToEmployee`, `employeeSignLetter`,
  `downloadLetterPdf` — same template SWR pattern as `src/actions/users.ts` /
  `src/actions/employee-records.ts`. Every status-transition mutation revalidates both the single
  letter (`GET /letters/:id`) and every cached `GET /letters` list. `downloadLetterPdf` reuses
  Sprint 2's `src/utils/download-blob.ts` helper (`responseType: 'blob'`, not an SWR/`fetcher`
  call) — same as `downloadDocument`/`exportStaffSummaryCsv`. `employeeSignLetter` additionally
  revalidates the subject's `GET /employees/:id/record` cache key, since the contract's
  `employee-sign` endpoint auto-files the signed PDF into the subject's E-record — signing a
  letter and then visiting your own E-record page (without a hard refresh) should show it without
  a stale cache.
- **Letter Templates** (`src/sections/letter-template/`, route
  `/dashboard/letter-templates{,/new,/:id/edit}`): HR/CEO/ADMIN can view the list (`RoleBasedGuard`,
  same pattern as Staff Summary); only ADMIN sees "New template"/"Edit" affordances
  (`currentRole === 'ADMIN'` check, plus the create/edit routes themselves are wrapped in
  `RoleBasedGuard allowedRoles={['ADMIN']}`, so a non-admin hitting the URL directly gets
  "Permission denied" rather than a broken form).
  - `letter-template-new-edit-form.tsx`: name/type/roleScope/isActive/a plain multiline `bodyHtml`
    textarea (per the contract's scope cut #1 — templates are placeholder content this sprint, no
    rich editor) + `letter-template-fields-editor.tsx`, a simple repeatable key/label/autoFilled
    row editor for `fieldsSchema` (add/remove rows, no drag-reorder — not needed for 2-4 field
    templates).
  - **Deviation**: `LetterTemplateDto` (the contract's list/detail DTO) intentionally omits
    `bodyHtml` — per the contract's own comment, it's "template source, not needed by the
    letter-creation UI... Add a dedicated endpoint later if a template editor UI needs to
    read/write `bodyHtml` directly." That endpoint doesn't exist yet, so the edit form has no way
    to read a template's *current* `bodyHtml` before saving — editing an existing template always
    re-sends whatever's in the (empty-by-default) body textarea, silently overwriting the stored
    body unless the user retypes it. An `Alert` in the edit form says so explicitly. Harmless this
    sprint (all bodies are placeholder text per scope cut #1), but flagging for the backend agent:
    if a later sprint needs real template editing, `GET /letter-templates/:id` (or a new endpoint)
    should return `bodyHtml` too.
- **Letters list** (`src/sections/letter/view/letter-list-view.tsx`, route `/dashboard/letters`):
  no `RoleBasedGuard` role check — HR/CEO/ADMIN see every letter, any other authenticated caller
  (including EMPLOYEE/MANAGER/PAYROLL) only ever sees their own (server-side filter on
  `GET /letters` per the contract, not a client-side role gate) — this is how an employee finds a
  letter waiting for their signature. `type`/`status` filters (`letter-table-toolbar.tsx`) +
  server-side pagination (`page`/`limit`, 1-based — see the Sprint 2 deviation note above, same
  assumption carried forward here). "New letter" button only for HR/ADMIN.
  - Row actions (`letter-table-row.tsx`) gated by BOTH the caller's role AND the letter's current
    `status`, matching the contract's endpoint table exactly (not just role): HR/ADMIN see "Submit
    to CEO" only on `DRAFT`/`CHANGES_REQUESTED` rows, "Send to employee" only on `CEO_SIGNED` rows;
    CEO sees "Request changes"/"Sign" only on `PENDING_CEO` rows; the letter's own subject sees
    "Sign now" only on `SENT_TO_EMPLOYEE` rows. A "Download PDF" icon appears whenever `hasPdf` is
    true, for any viewer. A "View" icon always navigates to the detail page.
- **Letter detail** (`src/sections/letter/view/letter-detail-view.tsx`, route
  `/dashboard/letters/:id`): no `RoleBasedGuard` — any authenticated user can attempt
  `GET /letters/:id` (the contract allows HR/CEO/ADMIN/self-if-subject; the backend is the real
  gate), a fetch error renders an inline "unable to load / no permission" message, same pattern as
  the Sprint 2 E-record page.
  - Manual fields (`letter-manual-fields.tsx`, shared with the create flow) render from the
    template's `fieldsSchema` fetched via `GET /letter-templates/:id/fields` (auto-filled entries
    are never rendered as inputs — they're resolved server-side, not part of `fieldValues`).
    Editable only for HR/ADMIN while `status` is `DRAFT`/`CHANGES_REQUESTED`; a "Save changes"
    button appears once a field is touched and calls `PATCH /letters/:id`.
  - `letter-timeline.tsx`: renders `events` as a stepper-style list using `@mui/lab`'s `Timeline`
    components — the same pattern already in the codebase at
    `src/sections/order/order-details-history.tsx` (found by searching for existing `Timeline`
    usage before building one from scratch, per the task's instruction), not a new dependency.
  - Signatures rendered as a plain list (signer name/role/timestamp) — no separate component,
    `signatures` is rarely more than 2 rows (CEO + employee) so a table felt like overkill.
  - Action buttons (submit/request-changes/sign/send/preview/download), same role+status gating
    logic as the list row, duplicated here as full-width buttons with confirmation dialogs
    (`letter-sign-dialog.tsx` — typed-name `signatureText` + confirm, reused for both CEO-sign and
    employee-sign by passing a different `onConfirm` callback; `letter-request-changes-dialog.tsx`
    — required `comment` field). Both dialogs are shared components in `src/sections/letter/` (not
    nested under `view/`) so the list row and the detail page use the exact same dialog rather than
    two copies.
  - "Render / re-render preview" (HR/ADMIN only, any status per the contract) calls
    `POST /letters/:id/preview`; "Download PDF" (anyone who can view the letter) appears once
    `hasPdf` is true and streams `GET /letters/:id/pdf` as a blob download, reusing
    `src/utils/download-blob.ts`.
- **Create letter flow** (`src/sections/letter/view/letter-create-view.tsx`, route
  `/dashboard/letters/new`, `RoleBasedGuard allowedRoles={['HR','ADMIN']}`): template picker
  (`GET /letter-templates?isActive=true`) + employee picker (`GET /users`, same "reuse the Users
  list pattern already used for `managerId`" approach as `user-new-edit-form.tsx` — a plain
  `MenuItem` list of `firstName lastName (email)`, not a new autocomplete component). Picking a
  template fetches its `fieldsSchema` and renders `letter-manual-fields.tsx` below an info `Alert`
  listing which fields are auto-filled (so HR knows they don't need to type
  `employee.fullName`/`employee.designation` etc. — those come from the subject's `UserDto` server
  side). Submit calls `POST /letters` → navigates to the new letter's detail page.
  - **Deviation**: manual fields are plain controlled `TextField`s in local component state
    (`Record<string, string>`), not `react-hook-form` fields. The field set is dynamic (template
    `fieldsSchema` keys aren't known at compile time), and `react-hook-form`'s `register()`
    interprets a dotted name like `"employee.fullName"` as a nested path — since auto-filled keys
    with dots are never rendered as inputs (only manual fields are), this wasn't hit in practice
    with the seeded templates, but a manual field whose `key` happens to contain a `.` would be
    safer handled this way regardless. Same "keep it simple" tradeoff as
    `src/utils/download-blob.ts` — no new form-state complexity for a dynamic, still-small field
    set.
- **In-app signing**: `letter-sign-dialog.tsx` — a typed-name (`signatureText`) `TextField` +
  confirm button in an MUI `Dialog`, `react-hook-form` + `zod` (`min(1)`, "type your full name to
  sign") like every other dialog in the codebase. No canvas/drawing library, per the contract's
  scope cut #3. Used from both the letters list row and the detail page for both the CEO's
  `POST /letters/:id/ceo-sign` and the subject's own `POST /letters/:id/employee-sign` — same
  component, different `onConfirm` callback wired by the caller.
- **Nav** (`src/layouts/nav-config-dashboard.tsx`): added "Letters" (no `allowedRoles` — every
  role sees it, since an employee needs it to find their own pending letters; the page itself has
  no client-side role gate either, since `GET /letters` is already server-filtered) and "Letter
  Templates" (`allowedRoles: ['HR', 'CEO', 'ADMIN']`, same pattern as "Staff Summary") under the
  existing "Management" section. Two new icons added to the `ICONS` map: `mail` (`ic-mail.svg`,
  already shipped by the minimal-kit template, previously unused) for Letters, `file`
  (`ic-file.svg`, same) for Letter Templates — no new SVG assets needed.
- **Routing** (`src/routes/sections/dashboard.tsx`): added `letters` (index/`new`/`:id`) and
  `letter-templates` (index/`new`/`:id/edit`) route groups alongside the existing trimmed set — no
  demo routes reintroduced.

## Deviations from `docs/API_CONTRACT_SPRINT3.md` (and why)

No changes to the contract's endpoints, DTOs, or status machine. Frontend-side notes for the
backend agent, in addition to the two called out inline above (template edit's `bodyHtml` gap;
manual-fields-as-plain-state instead of `react-hook-form`):

- **`GET /letters`'s `page` param is sent 1-based**, same assumption/caveat as Sprint 2's
  `GET /staff-summary` (see that section above) — the template's `useTable` hook is 0-based
  internally, so the list view sends `table.page + 1`. Flag if the backend implements it 0-based.
- **List-row and detail-page actions call the mutation endpoints directly and duplicate the
  role+status gating logic** (`src/sections/letter/letter-table-row.tsx` vs.
  `src/sections/letter/view/letter-detail-view.tsx`) rather than sharing one "letter actions"
  hook. Both were built from the same understanding of the contract's endpoint table, but if that
  table changes, both call sites need updating — worth consolidating into a shared hook if a
  future sprint adds more actions.
- **No optimistic UI on status transitions** — every action button shows a spinner/disabled state
  while its request is in flight, then relies on the actions layer's `mutate()` revalidation to
  refresh the letter/list (same as every other mutation in this codebase, e.g.
  `deleteUser`/`uploadEmployeeDocument`). Given the seed data's small scale this hasn't been an
  issue, but flagging since a real letter volume might make the "click submit, wait for the
  refetch, see the new status" round trip feel slower than a true optimistic update.

## Verification performed

- `npx tsc --noEmit` — clean, zero errors.
- `npm run build` (`tsc && vite build`) — clean, zero errors and zero lint warnings (the build's
  eslint pass — an initial run surfaced 6 `perfectionist/sort-imports`/`sort-exports` errors and 5
  matching warnings across the new files, all fixed with `eslint --fix`, then re-verified clean).
  Only the pre-existing, unrelated large-chunk-size notice remains (present before this sprint's
  changes too, same as Sprint 1/2).
- **Note (post-agent, orchestrating session):** the Sprint 3 backend was in fact live-verified
  end-to-end (full lifecycle via curl with disposable test accounts) shortly after this frontend
  work landed — see `docs/BACKEND_STATUS.md`'s Sprint 3 section. The frontend UI itself still
  hasn't been click-tested against it — that's still the open item, not "no backend exists yet."
- **Bug found and fixed (post-agent, orchestrating session):** the template edit form's flagged
  `bodyHtml` deviation (above) was a real trap, not just a documented curiosity — saving an edited
  template would silently blank its `bodyHtml` every time, since the form never has the real
  current value to re-send. Fixed in `letter-template-new-edit-form.tsx`: the form now only
  includes `bodyHtml` in the `PUT` payload if the user actually typed into that field this session
  (tracked via a `bodyHtmlTouched` flag); otherwise it's omitted entirely and the backend's
  existing partial-update behavior (`if (dto.bodyHtml !== undefined) ...`) leaves the stored value
  alone. `UpdateLetterTemplateDto` in `src/types/letter.ts` updated to make `bodyHtml` genuinely
  optional (previously typed as required, inherited from `CreateLetterTemplateDto`, which is still
  correct for creates — a new template always sends `bodyHtml`, defaulting to the placeholder
  copy). Verified with `npx tsc --noEmit`.
- **Not verified against a live backend.** No backend was running at the time of this work, and
  `Backend/src/employees/`, `Backend/src/staff-summary/` exist from Sprint 2 but no Sprint 3
  backend code (`letter-templates`/`letters` controllers, `letter_templates`/`letters`/
  `letter_events`/`signatures` entities/migrations) was present in the working tree yet — the
  backend agent's Sprint 3 work was still in progress in parallel, same situation as Sprints 1/2 at
  the point this frontend work was done. Once it's up, the manual click-through to do (mirrors the
  contract's own "Definition of done" checklist):
  1. Log in as `admin@bnw.local` → sidebar shows "Letters" and "Letter Templates" (between "Staff
     Summary" and the rest of "Management"). Letter Templates → shows the 2 seeded placeholder
     templates (`OFFER`, `EXPERIENCE`).
  2. Log in as HR → Letters → "New letter" → pick the Offer template + a seeded employee → manual
     fields (`salary`, `startDate`) render, an info alert lists the auto-filled fields → submit →
     lands on the new letter's detail page, status `DRAFT`.
  3. On the detail page: edit a field, save; "Render / re-render preview" → toast confirms; then
     "Download PDF" appears/works; "Submit to CEO" → status flips to `PENDING_CEO`, an event
     appears in the timeline.
  4. Log in as CEO → Letters list shows the letter (all letters visible to CEO) with "Request
     changes"/"Sign" actions on that row (only because status is `PENDING_CEO` — verify these
     disappear once status moves on). Try "Request changes" with a comment → status
     `CHANGES_REQUESTED`, comment shows in the timeline, HR can edit/resubmit. Try "Sign as CEO" on
     a fresh letter → typed-name dialog → confirm → status `CEO_SIGNED`, a signature row appears.
  5. Log in as HR/ADMIN → "Send to employee" on the `CEO_SIGNED` letter → status
     `SENT_TO_EMPLOYEE`.
  6. Log in as the subject employee → Letters list shows only their own letters (confirm a
     different employee's letters are NOT visible) → the `SENT_TO_EMPLOYEE` one has a "Sign now"
     action both on the row and the detail page → sign → status `SIGNED`, a second signature row
     appears (`signerRole` = the employee's actual role).
  7. Employee's own E-record (`/dashboard/employees/:id/record`, or the Account page's "My
     E-record" link) → the signed letter's PDF should now appear in the documents table with
     `source: LETTER` — confirms the `employee-sign` → E-record auto-filing integration (SWR cache
     for that page is explicitly revalidated by `employeeSignLetter`, so this should show up
     without a manual refresh).
  8. Confirm nothing from Sprint 1/2 regressed: Users CRUD, Staff Summary, and the existing
     E-record upload/request flows still work.

---

# Post-Sprint-3 polish — branding on the dashboard home page

`src/sections/overview/bnw-overview-view.tsx` (the dashboard's `/dashboard` index page, replaced
back in the Sprint 1 nav/routing cleanup — see that section above) updated in response to explicit
user feedback to carry the same real-logo/company-name branding already on the sidebar and sign-in
page onto the dashboard home screen too:

- Added a header row: `Logo` (full wordmark, `isSingle={false}`, 140×44) + `{CONFIG.appName}`
  ("BNW Chartered Accountants") as an `h5`, above the existing "Welcome back, {name}" greeting.
- Refreshed the summary card's copy, which had gone stale (still said "Sprint 1... Auth and User
  Management are live" after Sprints 2 and 3 shipped) to mention E-record, Staff Summary, and the
  Letter Engine.
- Added role-filtered quick-link buttons (Users → HR/ADMIN; Staff Summary → HR/CEO/ADMIN; Letters →
  everyone, matching the Letters nav item's own visibility) so the dashboard home page is a useful
  landing spot instead of a dead end. `QUICK_LINKS` is a small local array in the same file, not a
  new shared config — trivial enough not to warrant one.
- One thing worth knowing if this file is touched again: it's rendered *inside* `DashboardLayout`
  already (via the router, `pages/dashboard/index.tsx` → this component), so it must return
  `DashboardContent` (the content-area wrapper), not `DashboardLayout` itself — wrapping it in the
  full layout again would double up the sidebar/header. Got this wrong once while making this
  change and caught it before shipping; flagging so it doesn't happen again.

Verified with `npx tsc --noEmit` and a full `npm run build` — both clean.
