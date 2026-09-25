# BNW OMS — Project Status

Source of truth for scope: `BNW_OMS_Project_Guide (2) (1).md` (project root).
This file tracks what's actually been built, since the guide describes the *plan*, not current state.

## Stack (as actually being built — differs from the guide in two places)

| Layer | Guide's plan | What we're building | Why |
|---|---|---|---|
| Backend framework | Express | **NestJS** | Explicit user requirement. |
| Backend ORM | Sequelize | **TypeORM** | Pairs naturally with NestJS's module/DI system. |
| Frontend | Vite + React + MUI (custom minimal theme, JS) | **Vite + React + TypeScript**, using the existing **`Frontend/vite-ts`** minimal-kit template already in this repo | Explicit user requirement — reuse the theme/template already present instead of building one from scratch. |
| Database | PostgreSQL | PostgreSQL, **DB name `BNW`** | Explicit user requirement (guide used `bnw_oms`). |
| Everything else (roles, modules, workflows, DB schema shape, roadmap sprints) | — | Following the guide as-is | No reason to deviate. |

See `docs/API_CONTRACT_SPRINT1.md` for the exact API/DB contract both the backend and frontend work is built against.

## Repo layout

```
BNW/
├── BNW_OMS_Project_Guide (2) (1).md   # original requirements/plan doc
├── docker-compose.yml                  # Postgres 16, db "BNW"
├── docs/                               # this file + contracts, updated per sprint
├── Backend/                            # NestJS API
└── Frontend/
    └── vite-ts/                        # the real app (minimal-kit, full version) — other Frontend/* folders are unused reference templates
```

## Sprint status

| Sprint | Focus | Status |
|:-:|---|---|
| 0 | Foundations (repo, Docker DB, skeletons) | **Done** — see `docs/BACKEND_STATUS.md`, `docs/FRONTEND_STATUS.md` |
| 1 | Auth & User Management | **Done, verified end-to-end** — user confirmed live login and a working Users list against the real backend + Postgres `BNW`. |
| 2 | E-record & Staff Summary | **Done, in active use** — user has been navigating Staff Summary and employee E-record pages live (confirmed working — see the "where do I upload a document" exchange, which was about role permissions, not a bug: only HR/Admin can upload, via Staff Summary → an employee's row → E-record page). |
| 3 | Letter Engine | **Done, core flow confirmed live** — user created a letter, had the CEO sign it, and worked through the "send to employee" step live in their own running instance. One real misunderstanding surfaced and got resolved (a letter only shows up for whoever it's addressed to — the user's first test letter was addressed to their own Admin account, not the employee account they expected to see it on) and one real bug got found and fixed (a status-dependent action panel going blank with no explanation instead of saying "waiting on X"). Not yet fully confirmed: the CSV export, document-request flow, and the very last "employee signs → shows up in E-record" step. |
| Gap-fix | Employee profile fields, audit log, notifications table, missing letter templates | **Done, backend live-tested** — see `docs/API_CONTRACT_GAPS_FIX.md`. An audit against the original guide found 4 things it put in Sprint 0/1/3 scope that our own narrower contract docs had silently dropped: extended employee profile fields (phone/DOB/emergency contact/etc.), a system-wide audit log (login, letter status changes, signatures, document downloads), a `notifications` table (backend plumbing only — no frontend UI, since the fake notification bell was just removed at explicit request and isn't being revived), and 4 of the 6 required letter template types that had no placeholder at all (Contract/Redundancy/Terms-Change/Warning). All fixed. Frontend: real profile summary + editable "Personal details" tab, CEO/Admin-only Audit Log page. |
| 4 | Appraisals | **Done, backend live-tested end-to-end** — built to the user's own explicit spec (see `docs/API_CONTRACT_SPRINT4.md`), which is a **deliberate deviation from the original guide**: employee-initiated quarterly requests, not an HR-scheduled cycle. Flow: employee submits a self-evaluation (blocked for 3 months after) → manager adds remarks + a message and accepts/rejects → on accept, CEO adds remarks + a message and accepts/rejects/sends back to the manager → final result visible to HR, the manager, and the employee. Backend ran the full flow live including the send-back loop and the reject path. Frontend built a role-aware tabbed page (My Appraisals / My Team's / Pending My Review / All Appraisals) reusing the Letter Engine's timeline/dialog patterns. Post-launch fix (see addendum in the contract doc): a MANAGER's own appraisal now skips straight to the CEO instead of requiring a `managerId` that most managers don't have, and the "My Team's Appraisals" tab now shows real history by default instead of only pending items. A second addendum added two new Letter Engine template types — `APPRECIATION` (real content, provided by the owner) and `APPRAISAL_REJECTION` (drafted, needs the owner's review) — so HR can send the employee a proper letter once the CEO's decision is final, via the same draft → CEO-sign → send-to-employee flow as every other letter type. |
| 5 | Hiring (candidates, CV upload, convert-to-employee, joining pack) | **Done, live-verified end-to-end** (post-launch fix: converting a candidate now automatically copies their CV into the new employee's E-record — `EmployeesService.attachExistingFile()`, `source: CV` — closing guide requirement H1 "CVs are retained in employee E-record", which the first pass had missed). — see `docs/API_CONTRACT_SPRINT5.md`. **Deliberate deviation from the original guide**: the guide assumes a candidate can e-sign an offer/contract letter before they have an account, via an emailed secure link — we don't have passwordless auth or real SMTP built, so that's out of scope for this pass. Instead: HR bulk-uploads CVs (PDF) → candidates list (search/filter/status: NEW/SHORTLISTED/OFFERED/HIRED/REJECTED) → HR **converts a candidate into a real employee account** (sets role/department/manager/a mandatory password, same rule as regular user creation) → HR then sends that new employee an OFFER/CONTRACT letter through the **already-built Letter Engine**, unmodified. Also built: a joining pack (Operating Guide / Team Introduction / Policy Notes, seeded) that any employee can view and acknowledge ("I have read this", idempotent). One real addition beyond the contract: bulk CV upload generates a placeholder email (a CV has no structured email in it) that HR corrects before converting. Backend and frontend both live-tested independently and then re-verified together end-to-end (bulk upload → convert → new employee logs in with the password HR set) — no contract mismatches found. |
| 6–9 | See guide §11 (Leave/Feedback/Announcements, Work Orders, Payslips, Attendance) | Not started |

### Post-Sprint-3 UI/UX polish (ongoing, in direct response to live usage)

A significant amount of polish has happened since Sprint 3 shipped, all driven by the user actually
running the app and reporting real problems — full detail in `docs/FRONTEND_STATUS.md`'s
"Post-role-dashboards polish" section:

- **Role-tailored dashboard home screens** — Admin/CEO/"everyone else" each see different content
  on `/dashboard`, not three separate apps (one login, one app — see `docs/PROJECT_GUIDE.md` §1).
  Later given a full visual pass: colored icon stat tiles, a gradient welcome banner with a role
  badge.
- **Logo** — went through three rounds of real bugs (wrong image source, then a bad auto-crop, then
  a company name shown twice in three different places) before landing on: always the full clean
  wordmark image, sized correctly, with hover/press interactivity.
- **A real functional bug**: the sidebar's collapse-toggle arrow stopped working after a global
  "click feedback" styling change collided with that button's own positioning CSS. Root-caused and
  fixed (see FRONTEND_STATUS.md — this is worth reading if any future global `transform`-based
  styling is added, to avoid repeating it).
- **Notifications and Contacts** — both fully removed (fake demo data, no real backend feature
  behind them yet), per explicit request.
- **Sign-in page** — stripped of dead demo links/alerts (self-registration, a FAQ page, a
  multi-provider switcher — none apply to this app), given real branding and entrance animations.

### "Send to employee" can now include a message

User asked whether the PDF is shared with the employee along with a message when HR sends a
letter. The PDF itself was already reachable (view/download/sign in-app, per the earlier
visibility fix) but there was no way to attach a note. Added an optional `message` to `POST
/letters/:id/send-to-employee` — shown to the employee on the letter's timeline as the
`SENT_TO_EMPLOYEE` event's comment (same pattern the UI already uses for CEO's "Request changes"
comment). Frontend: clicking "Send to employee" now opens a small dialog with an optional message
field instead of sending immediately. Fully backward compatible — sending with no message still
works exactly as before. Real email delivery (with the PDF attached) is still the same open SMTP
item as everywhere else in the app — for now the employee gets it in-app once they log in.

### "My E-record" moved to the sidebar (every role)

Was previously only reachable via a small button on the Account page and a card on the employee
dashboard home — the user asked for it as its own sidebar item instead, positioned right above
Letters, for every role (not just Admin/HR). Since the nav item's path can't know the logged-in
user's id ahead of time, added a stable redirect route `paths.dashboard.myRecord` (`/dashboard/my-
e-record`) that immediately forwards to that user's own `employees/:id/record` page. Removed the
old Account-page button and dashboard-home card (redundant now). Confirmed with the user that
"Letters" stays in the sidebar too — it's still the only way to open/sign a letter sent to you, a
flow already tested and working; this was purely a nav reorganization, not a feature removal.

### Real bug fixed: a Letter's own subject could see it before HR sent it

User noticed an employee's Letters page showed a "Draft" letter (and a "CEO signed" one) about
themselves — letters HR/CEO hadn't actually released to them yet. Root cause: `GET /letters` and
`GET /letters/:id` let a non-HR/CEO/ADMIN caller see any letter where they're the subject,
regardless of status. Fixed: for a non-privileged subject, both endpoints now only show/allow a
letter once its status is `SENT_TO_EMPLOYEE` or `SIGNED` — HR/CEO's internal drafting-and-signing
pass (`DRAFT`/`PENDING_CEO`/`CHANGES_REQUESTED`/`CEO_SIGNED`) stays invisible to the subject until
explicitly sent, both in the list and by direct-URL-guessing the letter id. Live-verified the full
lifecycle: hidden at every pre-send status, appears the instant `send-to-employee` runs.

### Employees can now upload their own E-record documents

The E-record page ("My E-record", reachable from Account → the button next to the page heading)
already let an employee view their own documents; uploading was HR/ADMIN-only. Now `POST
/employees/:id/documents` also allows the record's own owner (self), not just HR/ADMIN — "Request
document" stays HR/ADMIN-only (doesn't make sense self-directed). Frontend: the "Upload document"
button now also shows for the record's own owner; "Request document" unchanged. Live-verified: self
upload succeeds, a third party (CEO, in the test) is still correctly blocked with 403, HR-uploading-
to-someone-else still works.

### Also added: Admin/HR can reset a user's password

User asked how to find a seeded/demo account's real password (it's bcrypt-hashed — genuinely
unrecoverable, by design). The actual gap: there was no way for Admin/HR to help a locked-out user
short of DB surgery. Added `POST /users/:id/reset-password` (HR/ADMIN only) — generates a fresh temp
password server-side, hashes and stores it, sets `mustChangePassword`, logs it to the console (same
stub-email pattern as user creation), and writes a `PASSWORD_RESET` audit log entry. Frontend: a
"Reset password" action in the Users list row menu, with a confirm step and a one-time dialog
showing the new temp password (with copy-to-clipboard) — it is not retrievable again after that.
Live-verified end-to-end with disposable test accounts: reset succeeded, the target user could log
in with the new password, a non-HR/ADMIN role got 403, and the audit log entry appeared correctly.

User then asked for the ability to see/set an exact password directly from the Edit User screen
(not just a randomly-generated one). Added an optional `password` field to `PATCH /users/:id`
(HR/ADMIN only, min 8 chars) — sets that exact password, forces `mustChangePassword`, and logs a
`PASSWORD_CHANGED` audit entry (separate from `PASSWORD_RESET`). Frontend: a "Change password"
field on the Edit User form, shown only when editing (not on Create), left blank = unchanged.
Live-verified: admin set a specific password on a disposable test user, that user logged in with
exactly that password, a sub-8-char password was correctly rejected (400), and the audit log
entry appeared.

### Also fixed: the Account page's "General" tab was never real

Found while working on the appraisal request (checking "where does an employee see their own
profile" led straight to it): `AccountGeneral` had been the minimal-kit's demo profile form,
completely disconnected from the real backend, since Sprint 1 — fake fields (country/state/city/
zip/"about"/a "Public profile" toggle/a non-functional "Delete user" button) that don't exist
anywhere in this app, never rewired. Replaced with a real read-only summary of the actual logged-in
user (name, email, role, employee code, designation, department, manager, join date, status).

### To finish confirming Sprint 2 + 3 (needs you)

1. Staff Summary: try the search/department/role/status filters, try **Export CSV**.
2. An employee's E-record page: try **Request document** (upload's already confirmed working).
3. Letters: finish one full lifecycle addressed to a real employee account (not yourself) — CEO
   sign → HR "Send to employee" → log in as that employee → sign → check their E-record for the
   auto-filed PDF.
4. Log in as `employee@bnw.local` → confirm Staff Summary is hidden from nav, their own E-record is
   read-only, and Letters only shows their own letters.

### To verify the gap-fix + Sprint 4 (needs you — none of this has been clicked through in a browser yet)

1. Account page → "Personal details" tab: fill in phone/address/DOB/etc., save, reload, confirm it
   persisted.
2. As CEO or Admin: sidebar → "Audit Log" → confirm login/document-download/letter-signature events
   show up as you do them elsewhere in the app.
3. Letters → New letter → confirm the template picker now lists all 6 types (Offer, Contract,
   Redundancy, Terms Change, Warning, Experience), not just 2.
4. Appraisals: as an employee, submit one. Log in as their manager, accept it with remarks. Log in
   as CEO, try "send back" once (confirm it returns to the manager's queue), then accept it. Confirm
   HR can see the final result in "All Appraisals". Try submitting a second one immediately as the
   same employee — should be blocked with a clear "next eligible" date.
5. Report anything that breaks.

## Decisions locked in (don't re-litigate without asking the user)

- DB name: `BNW`.
- API JSON: camelCase (not the guide's snake_case) — TypeORM's `SnakeNamingStrategy` still keeps DB columns `snake_case`.
- Frontend base: `Frontend/vite-ts` (the full minimal-kit, not the leaner `starter-vite-ts`) — has an existing JWT auth flow and a Users CRUD demo (`src/sections/user`) we rewire to the real API instead of building from scratch.
- Users module: HR/ADMIN create users; no password field on create — backend generates a temp password (stubbed email for now, real SMTP later per guide §2.2).

## Open items from the guide's §12 (unresolved — do not block Sprint 1 on these)

Blockers B2–B8 (e-signature provider, real letter templates, biometric sample file, payslip source data,
appraisal form questions, leave policy, SMTP sender) are **not needed for Sprint 1** (auth + users) and are
deferred until the sprints that need them (Sprint 3 letters, Sprint 5 appraisals, Sprint 7 payslips, Sprint 8
attendance). Flag them to the user again when those sprints start.
