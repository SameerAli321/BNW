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
| 1 | Auth & User Management | **Done, verified end-to-end** — user confirmed live login as `admin@bnw.local` and a working Users list (6 seeded users, correct roles/departments/manager) against the real backend + Postgres `BNW`. Post-launch UI polish also done: real company logo/name in the sidebar, sign-in page, **and dashboard home page** (replacing the minimal-kit's demo branding), demo-only widgets removed (workspace switcher, "Upgrade to Pro" card, fake dashboard charts), root route goes straight to login. |
| 2 | E-record & Staff Summary | **Code complete, not yet run by a person** — see `docs/API_CONTRACT_SPRINT2.md`. Backend agent live-verified every new endpoint (via disposable test accounts it cleaned up afterward) against a real Postgres. Frontend agent verified `tsc`/`npm run build` clean but never had a live backend to click through against. Pagination convention checked and confirmed consistent (both sides 1-based). Still needs a real click-through — see checklist below. |
| 3 | Letter Engine | **Code complete, backend live-verified, frontend not yet run by a person** — see `docs/API_CONTRACT_SPRINT3.md`. Templates are **dummy/placeholder content** (explicit instruction from project start — real templates are still an unresolved client blocker, guide §12 B3), and PDF rendering is a simple placeholder (`pdf-lib`, not the guide's `puppeteer`) — both documented as swap-in-later once real templates/e-signature requirements arrive from the client. Backend agent ran the **entire letter lifecycle end-to-end** (draft → CEO review/sign → send → employee sign, incl. auto-filing into E-record) via curl with disposable test accounts, cleaned up after itself. Frontend built clean but hasn't been clicked through in a browser against it yet. One real bug (template edit form silently blanking `bodyHtml` on every save) was found and fixed post-build — see `docs/FRONTEND_STATUS.md`. |
| 4–9 | See guide §11 | Not started |

### To see Sprint 2 + 3 working (needs you)

1. `docker compose up -d` (repo root), then in `Backend/`: `npm run migration:run && npm run seed && npm run start:dev` (seed is idempotent — safe to rerun, it'll just add the new document types/templates and skip existing users).
2. In `Frontend/vite-ts/`: `npm run dev`, log in as `hr@bnw.local` or `admin@bnw.local`.
3. Sidebar → **Staff Summary**: confirm the 6 seeded users show up, try the search/department/role/status filters, try **Export CSV**.
4. Click into an employee's row → **E-record** page: try uploading a document (any small PDF/PNG), confirm it lists and downloads back correctly, try **Request document**.
5. Sidebar → **Letters** → **New letter**: pick the seeded Offer template + an employee, fill the manual fields, submit. Log in as `ceo@bnw.local`, sign it. Log back in as HR, "Send to employee." Log in as that employee, sign it. Then check their E-record — the signed letter's PDF should show up there automatically.
6. Log in as `employee@bnw.local` → confirm Staff Summary is hidden from nav, and their own E-record page shows read-only (no upload/request controls); confirm Letters only shows their own letters.
7. Report anything that breaks.

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
