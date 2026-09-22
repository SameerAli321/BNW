# BNW OMS — Backend Status (Sprint 0 + Sprint 1)

Backend lives in `Backend/` at the repo root. Stack: **NestJS 10 + TypeORM 0.3 + PostgreSQL**, per
`docs/API_CONTRACT_SPRINT1.md` (this deviates from the guide's Express/Sequelize examples — see
that contract doc's intro for why, and §0 "What's the same" below for how the guide's intent was
translated).

## How to run it

```bash
cd Backend
npm install

# from the repo root, in a separate shell:
docker compose up -d          # starts Postgres 16 in container "bnw-postgres", db "BNW"
                               # (user/password: postgres/postgres — check nothing else is
                               # already bound to port 5432 first, or the container silently
                               # fails to bind and you'll get "relation ... does not exist"
                               # errors that look like a migration problem but aren't)

cd Backend
npm run migration:run         # creates roles / departments / users / refresh_tokens tables
npm run seed                  # seeds roles, departments, and the 6 demo users — READ THE CONSOLE
                               # OUTPUT: it prints each seeded user's temp password once, never
                               # again and never to a file.
npm run start:dev             # http://localhost:5000/api/v1
```

Health check: `GET http://localhost:5000/api/v1/health` → `{"data":{"status":"ok"}}` (no auth).

Login as `admin@bnw.local` (or any seeded user) with the temp password printed by `npm run seed`.
`mustChangePassword` is `true` for every seeded user — the frontend should route to a
change-password screen using `POST /auth/change-password` before letting them proceed.

Other useful scripts: `npm run build` (tsc via `nest build`), `npm run lint`, `npm run
migration:generate -- src/migrations/<Name>` (needs a live DB to diff against),
`npm run migration:revert`.

## What's implemented

- **Project scaffold**: NestJS 10, TypeORM 0.3 (`typeorm-naming-strategies` → `SnakeNamingStrategy`
  so DB columns are snake_case while entities/DTOs/JSON stay camelCase), `pg`, JWT
  (`@nestjs/jwt` + `passport-jwt`), `class-validator`/`class-transformer`, `@nestjs/config`,
  `helmet`, `cookie-parser`, `@nestjs/throttler`. ESLint + Prettier configured and clean.
- **Bootstrap** (`src/main.ts`): helmet, CORS from `CLIENT_URL` with `credentials: true`,
  cookie-parser, global `ValidationPipe` (whitelist + transform + forbidNonWhitelisted), global
  prefix `api/v1`.
- **Response envelope**: `ResponseInterceptor` wraps every controller return value as `{ data }`
  unless it's already `{ data, meta? }`-shaped (used for the paginated `GET /users` list).
  `HttpExceptionFilter` turns every thrown exception into `{ error: { code, message, details? } }`.
- **Entities** (`src/entities/`): `Role`, `Department`, `User` (self-referencing `manager` /
  `reports`, `status` enum, `@DeleteDateColumn` soft delete), `RefreshToken`. `User.role` is stored
  directly as a Postgres enum column (`users_role_enum`) rather than a `role_id` FK to the `roles`
  table — see "Deviations" below.
- **Migration** (`src/migrations/1758540000000-InitSchema.ts`): creates `roles`, `departments`,
  `users`, `refresh_tokens` with the exact snake_case columns TypeORM's `SnakeNamingStrategy` would
  generate from the entities, plus FKs/indexes. `synchronize` is `false` everywhere — schema is
  migration-only, per the guide's "never use sync()" rule.
- **Seed script** (`src/database/seed.ts`, `npm run seed`): 6 roles, 4 departments (`Operations`,
  `HR`, `Finance`, `Engineering`), 6 demo users (`admin@bnw.local`, `hr@bnw.local`,
  `manager@bnw.local`, `employee@bnw.local`, `ceo@bnw.local`, `payroll@bnw.local`), each with a
  random temp password printed to the console once, `mustChangePassword: true`.
  `employee@bnw.local.managerId` is wired to `manager@bnw.local`. Idempotent — re-running it skips
  users/roles/departments that already exist instead of erroring or duplicating.
- **Auth module** (`src/auth/`): `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
  `GET /auth/me`, `POST /auth/change-password` — request/response shapes match the contract
  exactly. Access token payload `{ sub, role, email }` (15m default expiry, from
  `JWT_ACCESS_EXPIRES`). Refresh token payload `{ sub, jti }` (7d default, from
  `JWT_REFRESH_EXPIRES`), sent as an httpOnly cookie scoped to `/api/v1/auth`, stored **hashed**
  (bcrypt) in `refresh_tokens` keyed by `jti`, and rotated (old row revoked, new row inserted) on
  every successful `/auth/refresh`. Passwords hashed with bcrypt (cost 10). `/auth/login` is
  rate-limited via `@nestjs/throttler` (10 attempts / 60s, on top of the app-wide 100/60s default).
- **RBAC**: `@Roles(...)` decorator + global `RolesGuard` (reads `role` off the JWT payload set by
  `JwtAuthGuard`, which is also applied globally — routes opt out with `@Public()`, currently only
  `/health`, `/auth/login`, `/auth/refresh`, `/auth/logout`). `UsersService.assertCanView` /
  `assertCanViewReports` implement the `self` / `manager-of` ownership checks for
  `GET /users/:id` and `GET /users/:id/reports` for callers who aren't HR/ADMIN.
- **Users module**: `GET/POST /users`, `GET/PATCH/DELETE /users/:id`, `GET /users/:id/reports`,
  `GET /roles`, `GET /departments` — all per the contract's role table. `POST /users` generates a
  server-side temp password (bcrypt-hashed before storage) and currently **logs it to the console**
  instead of emailing it — see the `// STUB` comment in `UsersService.create`; needs real SMTP
  (Nodemailer, per the guide §6) in a later sprint. `DELETE /users/:id` soft-deletes
  (`@DeleteDateColumn`) and also sets `status = INACTIVE`. `password_hash` is never serialized —
  `UserDto`/`toUserDto()` only ever project the allowed fields.
- **Health**: `GET /api/v1/health` → `{ data: { status: 'ok' } }`, `@Public()`.

## Verification performed

- `npm install` — succeeds (822 packages). `bcrypt`'s native build had to be explicitly approved
  (`npm approve-scripts bcrypt @nestjs/core` then `npm rebuild bcrypt`) because this environment's
  npm blocks install scripts by default; documented here in case a fresh clone hits the same thing.
- `npx tsc --noEmit` — **0 errors**.
- `npx nest build` — **succeeds**, emits `dist/`.
- `npx eslint "src/**/*.ts"` — **0 errors** after `--fix` (all fixes were import-wrapping/formatting,
  no logic changes).
- **Update — now verified against a live local Postgres.** The sandbox that built this slice had no
  Docker, so the above was originally cross-checked by hand only. Since then, on the developer's own
  machine: `npm run migration:run` created `roles` / `departments` / `users` / `refresh_tokens`
  cleanly (0 → 1 migration applied, all FKs/indexes/enums created as written), and `npm run seed`
  populated the 6 roles, 4 departments, and 6 demo users (temp passwords printed to console,
  `employee@bnw.local` correctly linked to `manager@bnw.local`). **DB credentials changed**: the
  developer runs Postgres with user/password `postgres`/`postgres` (not the original `bnw`/
  `YOUR_DB_PASSWORD`) — `docker-compose.yml`, `Backend/.env`, and `Backend/.env.example` have all
  been updated to match. `npm run start:dev` boots and serves `/api/v1/health` correctly against
  this DB. **Still not verified**: a real end-to-end login round-trip through the frontend UI —
  confirm that next (see `API_CONTRACT_SPRINT1.md`'s Sprint 1 "Definition of done" checklist).

## Deviations from `API_CONTRACT_SPRINT1.md`

None required. One internal (non-contract) modeling choice worth flagging since the guide's §8.1
schema differs from it:

- The guide's `users` table has `role_id` (FK → `roles.id`). This implementation instead stores
  `User.role` as a native Postgres enum column (`users_role_enum`) with the same 6 values, matching
  the JWT payload (`role: roleName`) and `UserDto.role` shapes the contract defines. The `roles`
  table still exists and is seeded (so `GET /roles` and future FK-based features have somewhere to
  live), it just isn't referenced by `users.role` yet. This doesn't affect any request/response
  shape in the contract — flagging it here rather than editing the contract doc, since the contract
  itself only specifies the `role` enum on the JSON side, not the DB FK shape.

## What's left for later sprints

- Real SMTP email delivery for the "set your password" flow (`UsersService.create`'s stub), plus
  password-reset (`forgot-password` / `reset-password`, listed in the guide's §9 but not in the
  Sprint 1 contract).
- `employee_profiles`, E-record/documents, staff summary, hiring/letters, appraisals, leave,
  feedback boxes, announcements, payslips, work orders, attendance, activity/audit logs — all of
  §8.1's other tables and §9's other endpoint groups, per the guide's sprint roadmap (§11).
- Automated tests (`jest`/`supertest`) — devDependencies are wired up but no test suites were
  written yet for this slice.
- Swap the manual hand-written migration for a CLI-generated one (`npm run migration:generate`)
  once a reachable dev Postgres confirms it diffs to empty against the current entities.
