# BNW OMS — Project Guide (current build)

This is the plain-language guide to what BNW OMS actually is and what's actually been built,
written for you to read top to bottom. The original requirements document —
`BNW_OMS_Project_Guide (2) (1).md` at the repo root — is still the source of truth for *scope*
(what every module should eventually do). This file is the source of truth for *what exists right
now* and *how it's put together*, replacing the need to piece that together from the sprint-by-sprint
status files.

For deep implementation detail per sprint, see `docs/BACKEND_STATUS.md`, `docs/FRONTEND_STATUS.md`,
and the `docs/API_CONTRACT_SPRINT*.md` files — this guide summarizes and links out to those rather
than repeating them.

---

## 1. What this system is

One internal web application for BNW's HR and operations paperwork. Everyone — an employee, their
manager, HR, the CEO, payroll, or a system admin — logs into the **same app, at the same URL**,
with their own account. There is no separate "employee app" or "admin app" or "CEO app" — it's one
codebase, one login screen, one running server.

What each person sees and can do is controlled by their **role**. Every user account has exactly
one role:

| Role | Who | What they're for |
|---|---|---|
| `EMPLOYEE` | Every staff member | Sees and manages their own stuff — their letters, their E-record, (later) their leave/appraisals/payslips. |
| `MANAGER` | An employee with direct reports | Same as Employee, plus (later sprints) approves their team's leave/requests and writes their appraisals. |
| `HR` | HR staff | Prepares letters, manages employee records/documents, (later) imports attendance, posts announcements. |
| `CEO` | The CEO | Reviews and signs letters, (later) approves appraisals, sees a company-wide staff overview. |
| `PAYROLL` | Payroll staff | (Later sprints) sees payslip data and monthly claims summaries. |
| `ADMIN` | System administrator | Manages user accounts, letter templates, system settings. |

This is exactly the role design from the original requirements document (§4). Nothing about it
has changed — what's changed since the project started is that the app now actually enforces it
(both by hiding menu items a role can't use, and — more importantly — by the backend rejecting any
request a role isn't allowed to make, even if someone tries to call the API directly).

### "But I asked for 3 dashboards"

You did, and you have them — just not as 3 separate apps. When you log in, the dashboard home
page you land on is different depending on your role:

- **Admin** sees user counts (total/active/onboarding, broken down by role) and how many letter
  templates exist, with shortcuts to manage users and templates.
- **CEO** sees letters waiting for their signature and a one-window company-wide staff headcount,
  with shortcuts to review letters and open the full staff summary.
- **Everyone else** (Employee, Manager, HR, Payroll) sees their own letters waiting to be signed
  and a summary of their own E-record (documents on file, documents requested from them).

That's the "3 dashboards" — tailored home screens inside the one app, chosen automatically by your
role the moment you log in. See `docs/FRONTEND_STATUS.md`'s "role-tailored dashboard home screens"
section for the exact files.

---

## 2. How it's built

| Layer | Technology | Notes |
|---|---|---|
| Backend | **NestJS** (Node.js) + **TypeORM** + **PostgreSQL** | Database name `BNW`. Deviates from the original guide's Express/Sequelize suggestion — explicit choice made at project start. |
| Frontend | **React + TypeScript + Vite**, using the **minimal-kit** theme/template | Lives in `Frontend/vite-ts/`. The other folders under `Frontend/` (`next-ts`, `starter-next-ts`, `starter-vite-ts`) are unused reference templates — ignore them. |
| Auth | JWT access token (15 min, kept in memory, never localStorage) + rotating refresh token in an httpOnly cookie (7 days) | Standard, secure pattern for an internal portal. |
| API shape | Every response is `{ data: ... }` on success or `{ error: { code, message } }` on failure. One consistent envelope across every endpoint. | |
| File storage | Local disk under `Backend/uploads/` for now (git-ignored) | Cloud storage (S3-style) is a later upgrade, not needed yet at this scale. |

Full architecture reasoning and every deliberate deviation from the original guide is recorded in
`docs/PROJECT_STATUS.md`'s "Decisions locked in" section — worth reading once if you want the
"why", not just the "what".

---

## 3. What's actually built and working, module by module

| Module | Status | What it does |
|---|---|---|
| **Login & accounts** | ✅ Built, confirmed working by you | Everyone logs in with email + password. Admin/HR create new accounts (temp password auto-generated, currently logged to the server console instead of emailed — see §5). |
| **User management** | ✅ Built, confirmed working by you | Admin/HR can list, create, edit, and deactivate employee accounts — role, manager, department, designation, join date. |
| **E-record** (per-employee document folder) | ✅ Built, confirmed working by you | Every employee has a folder for their documents (CVs, signed letters, etc.). HR/Admin upload documents and request specific documents from an employee; everyone can see and download their own. Reached via Staff Summary → click a person's row. |
| **Staff Summary** | ✅ Built, in use by you | One searchable, filterable, exportable table of every employee — for HR, CEO, and Admin. CSV export not yet specifically re-confirmed since the last round of changes. |
| **Letter Engine** | ✅ Built, core flow confirmed live by you | HR prepares a letter (offer, contract, redundancy, terms change, warning, or experience letter) from a template → **CEO reviews and e-signs it** → sent to the employee → **employee e-signs it** → automatically filed into their E-record. One generic system handles all six letter types. **Templates are currently placeholder/dummy content** — see §5, this is intentional and waiting on you. You've walked a letter through draft → CEO sign → send-to-employee live; the very last step (employee signs → lands in their E-record) is the one piece still worth double-checking. |
| **Role-tailored dashboards** | ✅ Built, polished | Covered in §1 above — Admin/CEO/everyone-else each get their own dashboard home content, now with colored stat tiles and a proper welcome banner instead of plain text. |
| **My Profile** | ✅ Built, confirmed working | Every logged-in person sees their own real identity info (name, role, department, manager, etc.) on the Account page, plus an editable "Personal details" tab (phone, address, DOB, emergency contact, national ID, bank details). |
| **Audit Log** | ✅ Built | CEO/Admin-only page logging who did what and when — logins, letter status changes, signatures, document downloads. |
| **Appraisals** | ✅ Built, backend live-tested | Employee requests one every 3 months → manager reviews (remarks + message + accept/reject) → on accept, CEO reviews (remarks + message + accept/reject/send back to manager) → result visible to HR, the manager, and the employee. Built to your exact spec — this is **not** the original guide's more complex "HR schedules a quarterly cycle for everyone" version, it's the simpler employee-initiated flow you described. |
| Hiring extras (CV upload, candidates, joining pack) | ❌ Not built yet | Next per the original roadmap order. |
| Leave, Feedback boxes, Announcements | ❌ Not built yet | |
| Work Orders (reimbursement/equipment requests) | ❌ Not built yet | |
| Payslips | ❌ Not built yet | |
| Attendance (biometric import) | ❌ Not built yet | |

Since the last big status update, most of the work hasn't been new modules — it's been fixing and
polishing what's already built, in direct response to you actually clicking around the real app:
a fully broken logo (three separate bugs, now fixed), the sidebar collapse button silently
breaking (fixed, and the root cause — a global style change colliding with that button's own
positioning — is written up so it doesn't happen again), the fake Notifications/Contacts widgets
removed, and the sign-in page stripped of dead demo links and given real animation. Full detail in
`docs/FRONTEND_STATUS.md`'s "Post-role-dashboards polish" section.

---

## 4. How to run it yourself, right now

```bash
# 1. Database (from the repo root)
docker compose up -d
# check nothing else already owns port 5432 first, or this silently fails to bind

# 2. Backend
cd Backend
npm install
npm run migration:run
npm run seed          # prints 6 demo users' temp passwords to the console — copy admin@bnw.local's
npm run start:dev     # http://localhost:5000/api/v1

# 3. Frontend (separate terminal)
cd Frontend/vite-ts
npm install
npm run dev            # http://localhost:8080
```

Log in at `http://localhost:8080` as `admin@bnw.local` with the password the seed script printed.
The seeded demo accounts (all `@bnw.local`, one per role — `admin`, `hr`, `manager`, `employee`,
`ceo`, `payroll`) let you log in as each role and see how the dashboard and menu change.

Step-by-step manual test checklists for what's built so far (Staff Summary, E-record, the full
letter lifecycle) are in `docs/PROJECT_STATUS.md` — worth working through once to confirm
everything behaves the way this guide says it does.

---

## 5. Things still waiting on you

These aren't things I can decide — they need real input from BNW/the client:

- **Real letter templates.** The offer letter, contract, redundancy letter, warning letter, etc.
  are all placeholder text right now, by your own instruction at the start of this project
  ("create dummy then will update according to data"). Send the real documents whenever they're
  ready and I'll swap them in — it's a content update, not a rebuild.
- **E-signature approach.** Right now, "signing" a letter means typing your name in a confirmation
  box (a simple, legally-weak signature). The original guide flagged that a paid e-signature
  provider (DocuSign-style) might be wanted instead — that's a cost/legal decision, not mine to
  make.
- **Real SMTP/email sending.** Right now, anything that should email someone (a temp password, a
  letter ready to sign) is only logged to the server console, not actually emailed. Needs a real
  email account/service to send from.
- The other open questions from the original guide's §12 (biometric device sample file, payslip
  data source, appraisal form questions, leave policy) — not urgent yet, they'll matter once those
  specific modules get built.

---

## 6. What's next

Appraisals is now built. Tell me either:
- **"Build Hiring next"** — CV upload, candidate tracking, converting a candidate to an employee
  account, or
- **"Build Leave next"** — leave requests + approval + balances, or
- **keep polishing** what's already built and verifying it live — you've been finding real, useful
  things to fix by actually using the app (the logo bugs, the toggle button, the dead sign-in
  links, the fake "General" profile tab all came from this), and there's still a checklist of
  Sprint 2/3/4 things worth clicking through yourself (see `docs/PROJECT_STATUS.md`), or
- pick anything else from the roadmap.

Whatever's next, the pattern stays the same: I write a contract doc pinning down exactly what's
being built, build backend and frontend in parallel against it, verify it actually works, and
update this guide and the status docs so you always have an accurate picture — not just a promise.
