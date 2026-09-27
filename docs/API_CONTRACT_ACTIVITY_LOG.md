# BNW OMS — Daily Activity Log API Contract

Covers guide requirement **U3** ("Daily activity log for employees", §3.1) using the
`daily_activity_logs` table from §8.1 and the `GET/POST /activity-logs` endpoint group from §9.
The system audit trail half of U3 already exists (`audit_logs`, see `API_CONTRACT_GAPS_FIX.md`).

Same conventions as every other contract: base path `/api/v1`, camelCase JSON, `{ data, meta? }`
on success, `{ error: { code, message, details? } }` on failure, snake_case DB columns.

## What it does

- **Every role** logs their own work: one row per task, several per day allowed.
- **MANAGER** sees the entries of their **direct reports** (users whose `managerId` is them).
- **CEO** sees **managers'** entries (a dedicated view) and **all staff**.
- **ADMIN** sees **all staff**.
- Only the **owner** can edit or delete an entry. Nobody edits someone else's log.
- HR has no cross-staff view. Not requested; easy to add to `GET /activity-logs` later.

## Table: `daily_activity_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | int, FK → `users.id` ON DELETE CASCADE | Always the caller on create. Indexed. |
| `activity_date` | date | `YYYY-MM-DD`. Cannot be in the future. Indexed. |
| `category` | enum `daily_activity_logs_category_enum` | `CLIENT_WORK`, `INTERNAL`, `MEETING`, `TRAINING`, `ADMINISTRATIVE`, `OTHER` |
| `hours` | numeric(4,2) | 0.25–24. DB `CHECK (hours > 0 AND hours <= 24)`. |
| `description` | text | 1–2000 chars. |
| `created_at` / `updated_at` | timestamp | |

Migration: `Backend/src/migrations/1759120000000-DailyActivityLogs.ts`.

## Endpoints

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/activity-logs` | any authenticated | Logs an entry for the caller. |
| GET | `/activity-logs/mine` | any authenticated | Caller's own entries. |
| GET | `/activity-logs/team` | MANAGER | Direct reports' entries (not the manager's own). |
| GET | `/activity-logs` | CEO, ADMIN | Everyone. CEO's "Managers" view = `?role=MANAGER`. |
| PATCH | `/activity-logs/:id` | owner only (403 otherwise) | Partial update. |
| DELETE | `/activity-logs/:id` | owner only (403 otherwise) | Hard delete. Returns `{ data: { deleted: true } }`. |

**Validation (400):** future `activityDate`; the caller's total for that day would exceed 24 hours
(checked on create and edit, excluding the entry being edited); bad category / hours / empty
description.

### Query params (all list endpoints)

`from`, `to` (`YYYY-MM-DD`, inclusive), `category`, `page` (default 1), `limit` (default 25).
`/team` and `/activity-logs` also take `q` (name/email search) and `userId`; `/activity-logs` also
takes `role` and `departmentId`. `/mine` ignores the people filters.

Results are ordered by `activityDate DESC, createdAt DESC`. Entries of soft-deleted users are
excluded.

### Request body — `POST` (all fields required) / `PATCH` (all optional)

```ts
{ activityDate: string; category: ActivityCategory; hours: number; description: string }
```

### Response shapes

```ts
interface ActivityLogDto {
  id: number;
  userId: number;
  userName: string;       // "First Last"
  userRole: string | null;
  activityDate: string;   // 'YYYY-MM-DD'
  category: ActivityCategory;
  hours: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// every list endpoint
{ data: ActivityLogDto[]; meta: { total: number; page: number; limit: number; totalHours: number } }
```

`meta.totalHours` is the sum across **all** matching rows, not just the current page.

## Frontend

Sidebar → **Daily Activity** (`/dashboard/activity`, every role). One page, role-aware tabs:
**My Activity** (everyone; log/edit/delete) · **My Team** (MANAGER) · **Managers** (CEO) ·
**All Staff** (CEO, ADMIN, with role filter). Filters: date range, category, name search
(multi-person tabs). Code: `Frontend/vite-ts/src/sections/activity-log/`,
`src/actions/activity-logs.ts`, `src/types/activity-log.ts`.

## Verification

Live API test against the real Postgres (22 checks, all passing): create + each validation
rule, `/mine` scoping, manager sees reports but not self in `/team`, CEO `role=MANAGER` view, ADMIN
view, filters, 403s (employee → `/team` and all-staff, manager/HR → all-staff, non-owner edit/delete),
owner edit, owner delete. Frontend: `tsc` + ESLint + Prettier clean. **Not yet clicked through in
a browser.**
