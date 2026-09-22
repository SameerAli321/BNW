# BNW OMS — Sprint 1 API Contract (Auth + User Management)

Shared contract for the Backend (NestJS) and Frontend (React/Vite/TS, minimal-kit `vite-ts`) agents.
Both sides must match this exactly. If either side needs to change something here, update this file first.

Adapted from `BNW_OMS_Project_Guide (2) (1).md` §9, but the guide's stack was Express+Sequelize+snake_case
JSON. This project uses **NestJS + TypeORM + PostgreSQL** instead, so:

- **Database**: PostgreSQL, DB name **`BNW`**, columns `snake_case` (TypeORM `SnakeNamingStrategy`).
- **API JSON**: **camelCase** (idiomatic for NestJS/TS DTOs and the TS frontend) — this is a deliberate
  deviation from the guide's snake_case JSON. TypeORM handles the snake_case ↔ camelCase mapping.
- **Response envelope** (unchanged from guide): `{ "data": ... }` on success, on failure:
  `{ "error": { "code": "STRING_CODE", "message": "Human message", "details"?: any } }`.
- **Base path**: `/api/v1`.

## Ports & env (local dev)

| Service | URL |
|---|---|
| Backend (NestJS) | http://localhost:5000 |
| Frontend (Vite) | http://localhost:8080 |
| Postgres | localhost:5432, db `BNW` |

Backend `.env` keys: `NODE_ENV, PORT, CLIENT_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES`.

Frontend `.env` key: `VITE_SERVER_URL=http://localhost:5000/api/v1`.

CORS on backend: `origin: CLIENT_URL, credentials: true` (refresh token travels as httpOnly cookie).

## Roles (enum, fixed set for Phase 1)

`EMPLOYEE | MANAGER | HR | CEO | PAYROLL | ADMIN`

A user has exactly one role plus an optional `managerId` (self-referencing FK on `users`).

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | Returns `{ data: { accessToken, user } }`. Sets `refreshToken` httpOnly cookie. |
| POST | `/auth/refresh` | (cookie only) | Returns new `{ data: { accessToken, user } }`. |
| POST | `/auth/logout` | — | Clears refresh cookie, revokes stored refresh token. |
| GET | `/auth/me` | — (Bearer token) | Returns `{ data: { user } }`. |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` | Auth required. |

`accessToken` JWT payload: `{ sub: userId, role: roleName, email }`, expiry 15m.
`refreshToken` JWT: `{ sub: userId, jti }`, expiry 7d, stored hashed in `refresh_tokens` table, rotated on use.

`user` object shape (used in login/me responses and Users list):

```ts
interface UserDto {
  id: number;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'CEO' | 'PAYROLL' | 'ADMIN';
  managerId: number | null;
  managerName?: string | null;
  departmentId: number | null;
  departmentName?: string | null;
  designation: string | null;
  status: 'ONBOARDING' | 'ACTIVE' | 'INACTIVE';
  joinDate: string | null; // ISO date
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Note: `password_hash` is never returned in any response.

## Users (this sprint's core module)

| Method | Path | Roles allowed | Notes |
|---|---|---|---|
| GET | `/users` | HR, ADMIN | Query: `?q=&role=&status=&departmentId=&page=&limit=`. Returns `{ data: UserDto[], meta: { total, page, limit } }`. |
| POST | `/users` | HR, ADMIN | Create user (see `CreateUserDto` below). |
| GET | `/users/:id` | HR, ADMIN, self, manager-of | Returns single `UserDto`. |
| PATCH | `/users/:id` | HR, ADMIN | Partial update. |
| DELETE | `/users/:id` | ADMIN | Soft delete (`deleted_at`), also sets `status = INACTIVE`. |
| GET | `/users/:id/reports` | HR, ADMIN, self (if manager) | Direct reports of that user. |
| GET | `/roles` | any authenticated | Static list of the 6 roles. |
| GET | `/departments` | any authenticated | `{ data: { id, name }[] }`. |

`CreateUserDto`: `{ firstName, lastName, email, role, managerId?, departmentId?, designation?, joinDate?, employeeCode? }`.
Password is **not** supplied by HR — backend generates a temporary password, sets `mustChangePassword: true`,
and (stub for now, real SMTP later) logs/queues a "set your password" email. Document this stub clearly.

`UpdateUserDto`: same fields, all optional, plus `status`.

Authorization: enforce role checks with a `RolesGuard` + `@Roles(...)` decorator on every route above — never
trust the frontend. Ownership check for `GET /users/:id` and `/users/:id/reports` when caller is not HR/ADMIN.

## Seed data (must match on both sides for manual testing)

Seeded via TypeORM seed script on `npm run seed`:

- Roles: the 6 fixed roles.
- Departments: `Operations`, `HR`, `Finance`, `Engineering` (placeholder set, editable later).
- Users:
  - `admin@bnw.local` / temp password printed to console at seed time, role `ADMIN`, `mustChangePassword: true`.
  - `hr@bnw.local`, `manager@bnw.local`, `employee@bnw.local`, `ceo@bnw.local`, `payroll@bnw.local` — same pattern, role matching email prefix, `manager@bnw.local` set as `managerId` for `employee@bnw.local`.

**Never put real secrets in `.env.example` or in seed output committed to git** — only in the local
`.env` (git-ignored) and printed to the developer's own terminal.

## Definition of done for Sprint 1 vertical slice

1. `docker compose up -d` → Postgres `BNW` running.
2. `Backend`: `npm run start:dev`, migrations run clean, seed run clean, `GET /api/v1/health` → `{"data":{"status":"ok"}}`.
3. Login as `admin@bnw.local` from Postman with the seeded temp password → `accessToken` + `user` returned, refresh cookie set.
4. `Frontend`: `npm run dev` → login page (from `vite-ts`'s existing JWT auth view) hits the real backend, lands on
   the dashboard shell with the minimal-kit theme, sidebar nav filtered by the logged-in user's role.
5. Users list page (`vite-ts`'s existing `src/sections/user` demo, rewired to real API) shows the seeded users,
   supports create/edit/delete against the real backend, guarded to HR/ADMIN only.
