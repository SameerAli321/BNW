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
| 1 | Auth & User Management | **Done, not yet run end-to-end** — code complete on both sides against `API_CONTRACT_SPRINT1.md`, verified independently (backend: `nest build`/`tsc`/`eslint` clean; frontend: `tsc`/`vite build` clean). Nobody has run backend + Postgres + frontend together yet — do that next (see below) before calling the slice actually done per the guide's §0 definition of "project started". |
| 2–9 | See guide §11 | Not started |

### To actually see it working (next action, needs you — Docker/local machine)

1. `docker compose up -d` at the repo root — **check nothing else is already bound to port 5432 first** (a stray local Postgres blocked this in the sandbox that built the backend).
2. `cd Backend && npm install && npm run migration:run && npm run seed` — seed prints each demo user's temp password to the console, copy `admin@bnw.local`'s.
3. `cd Backend && npm run start:dev` — confirm `GET http://localhost:5000/api/v1/health` → `{"data":{"status":"ok"}}`.
4. `cd Frontend/vite-ts && npm install && npm run dev` — open http://localhost:8080, log in as `admin@bnw.local` with the temp password, confirm the dashboard loads and Users list shows the 6 seeded users.
5. Report back anything that breaks — this is the first time the two sides touch each other for real.

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
