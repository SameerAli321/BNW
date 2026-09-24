# BNW OMS — Closing Sprint 0/1/3 Scope Gaps

An audit against the original `BNW_OMS_Project_Guide (2) (1).md` found 4 things the guide put in
scope for Sprint 0/1/3 that our own narrower `API_CONTRACT_SPRINT*.md` docs silently dropped. This
doc specifies exactly what to add to close them. Builds on `API_CONTRACT_SPRINT1.md`/`SPRINT2.md`/
`SPRINT3.md` (still in force — same envelope, auth, roles, camelCase JSON).

## Gap 1 — `employee_profiles` (guide §3.1 U2, §8.1, §11 Sprint 1)

New table/entity, one row per user, all fields nullable (profile is filled in over time, not
required at account creation):

`employee_profiles` — `id, userId (FK users, unique), phone, address, dateOfBirth (date),
gender (enum: MALE|FEMALE|OTHER|PREFER_NOT_TO_SAY), emergencyContactName,
emergencyContactPhone, nationalId, bankName, bankAccountNumber, createdAt, updatedAt`.

Endpoints:
- `GET /users/:id/profile` — HR, ADMIN, self, manager-of (same ownership pattern as
  `UsersService.assertCanView`). Returns `{ data: EmployeeProfileDto | null }` (`null` if never
  filled in — don't auto-create an empty row on read).
- `PATCH /users/:id/profile` — HR, ADMIN, or self (an employee can fill in their own profile
  details; HR/Admin can also edit anyone's). Upserts (creates the row on first write). Partial
  update semantics, same as `LetterTemplate`'s `PUT`.

```ts
interface EmployeeProfileDto {
  userId: number;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null; // ISO date
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  nationalId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  updatedAt: string | null;
}
```

Frontend: add a "Personal details" section to the Users edit page (or a new tab there) for
HR/Admin editing anyone, and to the employee's own Account page (a new "Personal details" tab
alongside the existing General/Security tabs) for self-editing. Reuse the existing
`react-hook-form` + `zod` + `Field.*` pattern from `user-new-edit-form.tsx`.

## Gap 2 — `audit_logs` (guide §4, §8.1 "Activity", §11 Sprint 1, §13)

`audit_logs` — `id, actorId (FK users, nullable — null for unauthenticated actions like a failed
login), action (string, e.g. 'LOGIN', 'LETTER_STATUS_CHANGE', 'DOCUMENT_DOWNLOAD', 'SIGNATURE'),
entity (string, e.g. 'User', 'Letter', 'EmployeeDocument'), entityId (int, nullable), before
(jsonb, nullable), after (jsonb, nullable), ipAddress, createdAt`. Append-only, no update/delete
endpoint.

Log an entry (fire-and-forget, don't block the response on it) for, at minimum — per §13's
explicit list — every: login (success and failure), letter status change (every transition
already logged to `letter_events` — also mirror each one into `audit_logs` with
`entity: 'Letter'`), signature creation, and document download (`GET /documents/:id/download`).
Don't retrofit this everywhere in one pass — these four are what the guide explicitly names;
note in `BACKEND_STATUS.md` that broader coverage (every mutation) is future work, not required
now.

Endpoint: `GET /audit-logs` — CEO, ADMIN only. `?actorId=&entity=&action=&page=&limit=`. Returns
`{ data: AuditLogDto[], meta: { total, page, limit } }`.

```ts
interface AuditLogDto {
  id: number;
  actorId: number | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: number | null;
  ipAddress: string | null;
  createdAt: string;
}
```

`before`/`after` are intentionally omitted from the DTO (internal diff data, not needed by a
simple audit trail list view — add a detail endpoint later only if a real need shows up).

Frontend: a simple "Audit Log" page (CEO/ADMIN only, add to nav under Management) — a read-only
table (actor, action, entity, timestamp), reusing the existing table component pattern
(`TableHeadCustom`/`TablePaginationCustom`, same as Staff Summary). No filters UI required beyond
what's cheap to add (a type-ahead-free `entity`/`action` text filter is enough — don't overbuild).

## Gap 3 — `notifications` table (guide §8.1, §11 Sprint 1, §9)

`notifications` — `id, userId (FK users), type (string), title, body, link (nullable), readAt
(nullable timestamp), createdAt`.

Endpoints:
- `GET /notifications` — any authenticated user, scoped to their own (`userId = caller.id`,
  server-side, not a query param). `?unreadOnly=true`. Returns
  `{ data: NotificationDto[], meta: { total, unreadCount } }`.
- `POST /notifications/:id/read` — any authenticated user, only for their own notification (403
  otherwise). Sets `readAt`.

```ts
interface NotificationDto {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}
```

**Backend only for now — no frontend UI.** The frontend notification bell/drawer was just removed
at explicit user request (it was showing fake mock data with no real backend behind it). Building
this table/API gives future modules (letters, announcements, appraisals) a real place to write
notifications into, without reviving the UI that was just deliberately torn out. Don't wire any
frontend to this without asking first — a real notifications feature needs actual events to
populate it (e.g. "a letter needs your signature"), and none of that trigger wiring is in scope
here either. This gap-fix only stands up the empty plumbing the guide specified; wiring real
events into it happens module by module later (e.g. "send-to-employee" could insert a
notification row as well as its existing stub-email — flag as a nice-to-have, not required now).

## Gap 4 — Missing letter template types (guide §3.3 H9, §5.1, §8.1)

`Backend/src/database/seed.ts`'s `LETTER_TEMPLATES` array only seeds `OFFER` and `EXPERIENCE`. The
guide requires all 6 types share the one generic engine. Add 4 more placeholder templates, same
idempotent-by-`type` pattern as the existing 2, same "clearly marked placeholder" body text
convention:

- `CONTRACT` — name "Employment Contract (placeholder)", fields: `employee.fullName`,
  `employee.designation` (auto), `salary`, `startDate` (manual) — same shape as `OFFER`, matches
  guide H6 "same template + CEO review/sign flow" as the offer letter.
- `REDUNDANCY` — name "Redundancy Letter (placeholder)", fields: `employee.fullName` (auto),
  `lastWorkingDay`, `reason` (manual).
- `TERMS_CHANGE` — name "Change of Contract Terms (placeholder)", fields: `employee.fullName`
  (auto), `effectiveDate`, `changeSummary` (manual).
- `WARNING` — name "Warning Letter (placeholder)", fields: `employee.fullName` (auto),
  `warningReason`, `issuedDate` (manual).

No frontend changes needed for this one — the Letters "New letter" template picker already lists
whatever `GET /letter-templates?isActive=true` returns, so these 4 just show up automatically.

## Definition of done

1. `npm run migration:run && npm run seed` creates the 2 new tables and the 4 new templates
   cleanly, idempotently, without touching existing Sprint 1-3 data.
2. HR/Admin can view and edit any employee's personal details; an employee can view/edit their own.
3. CEO/Admin can open an Audit Log page and see at least login/letter-status-change/signature/
   document-download entries appear as those actions happen live.
4. `GET /notifications` works (returns an empty list for everyone right now — that's correct,
   nothing writes to it yet) — confirmed via a direct API call, no frontend needed.
5. Letters → New letter → template picker now shows all 6 types.
6. Nothing from Sprint 1/2/3 regresses.
