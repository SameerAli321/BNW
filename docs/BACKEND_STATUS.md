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
- `employee_profiles`, hiring/letters, appraisals, leave, feedback boxes, announcements, payslips,
  work orders, attendance, activity/audit logs — all of §8.1's other tables and §9's other
  endpoint groups not covered by Sprint 2, per the guide's sprint roadmap (§11).
- Automated tests (`jest`/`supertest`) — devDependencies are wired up but no test suites were
  written yet for this slice.
- Swap the manual hand-written migrations for CLI-generated ones (`npm run migration:generate`)
  once confirmed to diff to empty against the current entities.

---

# Sprint 2 — E-record & Staff Summary

Adds the per-employee document repository ("E-record") and the CEO/HR/Admin staff summary table,
per `docs/API_CONTRACT_SPRINT2.md` (guide §3.1 U4/U5, §8.1 "E-record & documents", §9).

## How to run it

Same bootstrap as Sprint 1 (`docker compose up -d`, `npm install`), plus:

```bash
cd Backend
npm run migration:run   # now also creates document_types / employee_documents / document_requests
npm run seed             # now also seeds the 9 starter document types (idempotent, same pattern
                          # as roles/departments — skips ones that already exist)
npm run start:dev
```

No new env vars. Uploaded files land on local disk at `Backend/uploads/employee-documents/`
(created automatically on first upload; already covered by `.gitignore`'s `uploads/` entry — added
in this sprint).

## What's implemented

- **Entities** (`src/entities/`): `DocumentType` (`document_types`), `EmployeeDocument`
  (`employee_documents`, FKs to `users.id` for both `userId` and `uploadedBy`, FK to
  `document_types.id`, `source` enum), `DocumentRequest` (`document_requests`, FKs to `users.id`
  for `userId`/`requestedBy`, FK to `document_types.id`, `status` enum). Same
  `SnakeNamingStrategy`/camelCase-property convention as Sprint 1. New enums:
  `src/common/enums/document-source.enum.ts`, `src/common/enums/document-request-status.enum.ts`.
- **Migration** (`src/migrations/1758630000000-EmployeeDocuments.ts`): creates the three tables
  above plus their enum types and indexes, written by hand in the same style as
  `1758540000000-InitSchema.ts` — separate file, the Sprint 1 migration is untouched.
  `synchronize` stays `false`.
- **Seed extension** (`src/database/seed.ts`): adds `DOCUMENT_TYPES` (the 9-item starter list from
  the contract) and seeds them the same idempotent way as roles/departments — the existing
  role/department/user seeding logic is untouched, just extended below it.
- **File upload**: `multer` (already a transitive dependency of `@nestjs/platform-express`, now
  declared explicitly as a direct dependency; `@types/multer` added as a devDependency).
  `src/employees/employee-documents.storage.ts` configures disk storage
  (`Backend/uploads/employee-documents/`, directory created on first write, filenames
  randomized via `crypto.randomUUID()`, original name preserved in the DB row), a 10MB
  `fileSize` limit, and a mime-type allowlist matching the contract exactly
  (`application/pdf`, `image/png`, `image/jpeg`, `application/msword`, the `.docx` mime type).
  Rejected mime types throw a `BadRequestException` (400); oversized files are converted by
  Nest's built-in multer error mapping into a `PayloadTooLargeException` (413).
- **E-record module** (`src/employees/`): `EmployeesController` (`GET /employees/:id/record`,
  `POST /employees/:id/documents`, `POST /employees/:id/document-requests`),
  `DocumentsController` (`GET /documents/:id/download`), `DocumentTypesController`
  (`GET /document-types`), all backed by `EmployeesService`. Roles/behavior match the contract's
  endpoint table exactly.
- **Ownership check reuse**: `UsersService` gained `assertCanViewRecord(caller, targetUserId)`
  (HR/ADMIN/CEO always allowed, else self or manager-of), used by both
  `GET /employees/:id/record` and `GET /documents/:id/download` (the latter checks it against the
  document's owning employee, not the caller). It shares its self/manager-of logic with the
  existing `assertCanView` via a new private `isSelfOrManagerOf` helper — `assertCanView` itself is
  unchanged in behavior, just refactored to use the shared helper.
- **Download endpoint**: streams the file with `createReadStream(...).pipe(res)` and sets
  `Content-Disposition: attachment`, using `@Res()` (non-passthrough) so the response bypasses the
  app's `ResponseInterceptor` envelope entirely — deliberate, since wrapping a file stream in
  `{ data }` JSON would break it. 404 if the document row doesn't exist or its file is missing on
  disk; 403 via `assertCanViewRecord` if the caller isn't authorized for that employee.
- **Staff summary module** (`src/staff-summary/`): `GET /staff-summary` (paginated, same
  `q`/`role`/`status`/`departmentId` filter pattern as Sprint 1's `GET /users`, plus a per-row
  `documentCount` computed via a grouped count query against `employee_documents`, not a loaded
  relation) and `GET /staff-summary/export` (same filters, no pagination, CSV response). Both
  restricted to HR/CEO/ADMIN via `@Roles()` on the controller class.
- **CSV export**: hand-rolled writer (`src/staff-summary/csv.util.ts`), RFC 4180 quoting/escaping,
  no new dependency, matching the guidance that this is a small dataset for now.

## Verification performed

- `npx tsc --noEmit` — **0 errors**.
- `npx nest build` — **succeeds**.
- `npx eslint "src/**/*.ts"` — **0 errors/warnings** (whole tree, not just the new files).
- **Live-verified against the same reachable dev Postgres used for Sprint 1** (this environment
  had a Postgres reachable on `127.0.0.1:5432` with the `BNW` database already migrated/seeded
  from Sprint 1 — unlike the Sprint 1 agent's original sandbox, Docker itself wasn't invokable here
  but Postgres was already running and reachable, so this could be fully exercised end-to-end):
  - `npm run migration:run` applied `EmployeeDocuments1758630000000` cleanly (0 → 1 new migration,
    all three tables/enums/indexes/FKs created as written).
  - `npm run seed` created the 9 document types and, as expected, skipped all 6 existing Sprint 1
    demo users untouched (idempotency confirmed — reran cleanly with no duplicates).
  - Booted `npm run start:dev` and drove the new endpoints with `curl` using two **disposable**
    test accounts created and deleted via a temporary script (not committed) — the real seeded demo
    users' passwords aren't known to this session, so real accounts were left untouched:
    - `GET /document-types` → 9 types, HR token, 200.
    - `GET /staff-summary?page=1&limit=5` (HR) → 200, correct pagination `meta`, `documentCount`
      computed correctly (verified it went from 0 to 1 after an upload).
    - `GET /staff-summary` as an EMPLOYEE → 403.
    - `GET /employees/:id/record` as self (EMPLOYEE viewing their own id) → 200, read-only shape.
    - `GET /employees/:id/record` as EMPLOYEE viewing a different id → 403.
    - `POST /employees/:id/documents` (HR, multipart with a real PDF) → 201, correct
      `EmployeeDocumentDto` shape including joined `documentTypeName`/`uploadedByName`.
    - Same upload as EMPLOYEE → 403 (role-gated).
    - Upload with an `.exe` (unsupported mime) → 400 `BAD_REQUEST`.
    - `POST /employees/:id/document-requests` (HR) → 201, correct `DocumentRequestDto` shape.
    - `GET /documents/:id/download` as HR and as the owning employee (self) → 200, correct
      `Content-Type`/`Content-Disposition`, byte-identical file content.
    - `GET /documents/:id/download` as an employee who doesn't own the document → 403.
    - `GET /documents/9999/download` (nonexistent) → 404.
    - `GET /staff-summary/export` (HR) → 200, `text/csv`, correct headers/filename, rows and
      `documentCount` matched the DB state.
  - Cleaned up afterwards: deleted the two disposable test users, their `employee_documents` rows
    (and the uploaded files on disk), `document_requests` rows, and `refresh_tokens` rows. Confirmed
    `Backend/uploads/employee-documents/` is empty again and Sprint 1's 6 demo users are untouched.

## Deviations from `API_CONTRACT_SPRINT2.md`

None. Endpoint paths, roles, DTO field names/shapes, table columns, file size limit, and mime
allowlist all match the contract as written.

## What's left for later sprints (Sprint 2 scope)

- `DocumentRequest`'s "fulfil" workflow (marking a request `RECEIVED` when the document is
  eventually uploaded) — modeled in the schema per the contract but explicitly out of scope for
  Sprint 2 (create/list only).
- Document deletion (Admin-only hard delete) — explicitly out of scope per the contract.
- Automated tests for the new modules — none written yet, same gap as Sprint 1.

---

# Sprint 3 — Letter Engine

Adds the letter-template/letter/signature workflow (offer, experience, etc. letters — HR drafts,
CEO reviews/signs, employee counter-signs in-app), per `docs/API_CONTRACT_SPRINT3.md` (guide §3.3,
§5.1 workflow, §8.1 "Letter engine").

## How to run it

Same bootstrap as Sprint 1/2 (`docker compose up -d`, `npm install` — this sprint adds `pdf-lib` as
a new direct dependency, pulled in by `npm install`), plus:

```bash
cd Backend
npm run migration:run   # now also creates letter_templates / letters / letter_events / signatures
npm run seed             # now also seeds the 2 placeholder letter_templates (OFFER, EXPERIENCE),
                          # idempotent — skips a type that already exists
npm run start:dev
```

No new env vars. Rendered letter PDFs land on local disk at `Backend/uploads/letters/` (created
automatically on first render; already covered by `.gitignore`'s `uploads/` entry from Sprint 2).

## What's implemented

- **Entities** (`src/entities/`): `LetterTemplate` (`letter_templates`), `Letter` (`letters`, FKs to
  `letter_templates.id` and `users.id` for both `subjectUserId`/`preparedBy`), `LetterEvent`
  (`letter_events`, append-only audit trail, FK to `letters.id`/`users.id`), `Signature`
  (`signatures`, FK to `letters.id`/`users.id`). Same `SnakeNamingStrategy`/camelCase-property
  convention as Sprints 1/2. New enums: `src/common/enums/letter-template-type.enum.ts`,
  `letter-status.enum.ts`, `letter-event-action.enum.ts`. `DocumentSource.LETTER` (already defined
  in Sprint 2's enum, unused until now) is what the auto-filed E-record row uses.
- **Migration** (`src/migrations/1758720000000-Letters.ts`): creates the four tables above plus
  their enum types and indexes, written by hand in the same style as the Sprint 1/2 migrations —
  separate file, those migrations are untouched. `synchronize` stays `false`.
- **Seed extension** (`src/database/seed.ts`): adds the 2 placeholder `letter_templates` (`OFFER`
  "Offer Letter (placeholder)", `EXPERIENCE` "Experience Letter (placeholder)") exactly as
  specified in the contract's seed data section — dummy `bodyHtml` clearly marked
  `[PLACEHOLDER TEMPLATE — ...]`, per the project owner's explicit "for template create dummy"
  instruction (scope cut #1). Idempotent by `type` — the existing role/department/user/
  document-type seeding logic is untouched, just extended below it.
- **PDF rendering** (`src/letters/letter-pdf-renderer.service.ts`): uses `pdf-lib` to lay out the
  letter's resolved field values (auto-filled fields resolved fresh from the subject `User` at
  render time — `employee.fullName`, `employee.designation`, `employee.email`,
  `employee.employeeCode`, `employee.department`, `employee.joinDate` — plus the manual
  `fieldValues` HR typed in) as plain text on a generated A4 PDF, with simple word-wrapping and
  page overflow handling. This is the contract's scope cut #4 — a placeholder renderer, not
  `puppeteer` + real `bodyHtml`/CSS (headless Chromium is unreliable to provision in a sandboxed
  build environment). `letters.pdfPath` and `GET /letters/:id/pdf` are written so swapping the
  renderer internals later won't change the API. `resolveLetterFieldValues()` is exported and
  reused for the signature's `documentHash` computation, so both the rendered PDF and the hash
  agree on what was actually signed.
- **Letter storage** (`src/letters/letter-pdf.storage.ts`): reuses Sprint 2's
  `UPLOADS_ROOT_DIR` constant (`src/employees/employee-documents.storage.ts`) so all uploaded/
  generated files share one root; rendered PDFs land under `uploads/letters/`, filenames
  randomized via `crypto.randomUUID()`, same convention as Sprint 2's E-record uploads.
- **Letters module** (`src/letters/`): `LetterTemplatesController`
  (`GET/POST /letter-templates`, `GET/PUT /letter-templates/:id`,
  `GET /letter-templates/:id/fields`) and `LettersController` (`POST/GET /letters`,
  `GET/PATCH /letters/:id`, `POST /letters/:id/preview`, `.../submit-to-ceo`,
  `.../request-changes`, `.../ceo-sign`, `.../send-to-employee`, `.../employee-sign`,
  `GET /letters/:id/pdf`), backed by `LettersService`. Roles/behavior match the contract's
  endpoint table exactly, including the "self if subject" list-filtering rule for
  `GET /letters` (non-HR/CEO/ADMIN callers get a server-side `subjectUserId = caller.sub` filter,
  not a query param they control).
- **Status machine**: `DRAFT`/`CHANGES_REQUESTED` → `PENDING_CEO` (submit-to-ceo) →
  `CHANGES_REQUESTED` (request-changes, CEO only, comment required) or `CEO_SIGNED` (ceo-sign,
  CEO only) → `SENT_TO_EMPLOYEE` (send-to-employee) → `SIGNED` (employee-sign, self only). Every
  invalid transition throws `ConflictException` (409) with a message naming the letter's actual
  status and the status it needed to be in — verified live (see below). `ARCHIVED`/`CANCELLED`
  and any `/cancel` endpoint are explicitly out of scope this sprint per the contract, same as
  documented there.
- **Audit trail & signatures**: every transition writes a `letter_events` row
  (`LettersService.logEvent`); `ceo-sign` and `employee-sign` each additionally write a
  `signatures` row (`signerRole` snapshotted — `'CEO'` for the CEO signature, the subject's actual
  JWT role for the employee signature) with a sha256 `documentHash` of the resolved field values +
  template version, plus best-effort `ipAddress`/`userAgent` from the request.
- **Ownership check**: `LettersService.assertCanView(caller, subjectUserId)` — HR/CEO/ADMIN
  always allowed, otherwise only the letter's own subject (no "manager-of" case here, unlike
  Sprint 2's `assertCanViewRecord` — letters are between HR/CEO and the named subject only, per
  the contract). Used by `GET /letters/:id` and `GET /letters/:id/pdf`; `employee-sign` uses a
  stricter check inline (`subjectUserId === caller.sub` exactly, no HR/CEO/ADMIN bypass — only the
  actual subject may sign their own letter).
- **E-record integration** (`employee-sign`): reuses Sprint 2's `EmployeeDocument`
  entity/service rather than duplicating file-storage logic — `EmployeesService` gained a new
  `fileGeneratedDocument()` method (alongside the existing multer-driven `uploadDocument()`) that
  inserts an `employee_documents` row for an already-on-disk file, used here to file the rendered
  PDF with `source: 'LETTER'`. The target `document_type_id` is resolved from the letter's
  (denormalized) template type — `OFFER` → "Signed Offer Letter", `CONTRACT` → "Signed Contract",
  everything else (including this sprint's `EXPERIENCE` template) falls back to "Other" (both
  seeded in Sprint 2's starter document types) since there's no dedicated experience-letter
  document type yet — flagged as a possible follow-up if the client wants one. Re-renders the PDF
  first if `pdfPath` is still null (i.e. `/preview` was never called) so signing always has
  something to file.
- **Email stubs**: `send-to-employee` and the "signed copy to HR" step of `employee-sign` both
  `console.log` with a `// STUB` comment, same style/wording pattern as Sprint 1's
  `UsersService.create` temp-password stub — real SMTP wiring is later (needs B8, same blocker
  noted in Sprint 1's status).
- **`EmployeesModule` now exports `EmployeesService`** (it didn't before) so `LettersModule` can
  inject it for the E-record filing step above; no other change to that module's existing
  behavior.

## Verification performed

- `npx tsc --noEmit` — **0 errors**.
- `npx nest build` — **succeeds**.
- `npx eslint "src/**/*.ts"` — **0 errors/warnings** (whole tree, not just the new files; two
  Prettier-only formatting issues were `--fix`ed).
- **Live-verified against a reachable dev Postgres** (same `127.0.0.1:5432`/`BNW` database used by
  Sprints 1/2, already migrated/seeded):
  - `npm run migration:run` applied `Letters1758720000000` cleanly (0 → 1 new migration, all four
    tables/enums/indexes/FKs created as written).
  - `npm run seed` created the 2 placeholder letter templates and, as expected, skipped all 6
    existing Sprint 1 demo users and Sprint 2's document types untouched; reran cleanly a second
    time with no duplicates (idempotency confirmed for both the new templates and the
    already-existing data).
  - Booted the built server (`node dist/main.js`, after `nest build`) and drove the full lifecycle
    with `curl` using **three disposable test accounts** (`test.hr.sprint3@bnw.local`,
    `test.ceo.sprint3@bnw.local`, `test.emp.sprint3@bnw.local`) created via a temporary,
    not-committed script — the real seeded demo users' passwords aren't known to this session, so
    real accounts were left untouched:
    - `GET /letter-templates` (HR) → 200, both placeholder templates present with the exact
      `fieldsSchema` from the contract.
    - `POST /letters` (HR, offer template, subject = test employee) → 201, `DRAFT`.
    - `POST /letters/:id/preview` → 200 `{ pdfUrl }`; `GET /letters/:id/pdf` → 200
      `application/pdf`, confirmed a valid PDF 1.7 file on disk with the field values laid out as
      text.
    - `POST /letters/:id/submit-to-ceo` (HR) → `PENDING_CEO`; confirmed it shows up in
      `GET /letters?status=PENDING_CEO` for the CEO account.
    - `POST /letters/:id/request-changes` (CEO, with comment) → `CHANGES_REQUESTED`; HR
      `PATCH /letters/:id` while in that status → fieldValues updated; re-`submit-to-ceo` →
      `PENDING_CEO` again.
    - `POST /letters/:id/ceo-sign` (CEO) → `CEO_SIGNED`, `signatures` row created
      (`signerRole: 'CEO'`).
    - `POST /letters/:id/employee-sign` called **before** `send-to-employee` → **409** (invalid
      transition, correctly rejected).
    - `POST /letters/:id/send-to-employee` (HR) → `SENT_TO_EMPLOYEE`; confirmed the `// STUB`
      console log fired (`[stub email] "A letter is waiting for your signature" -> ...`).
    - `POST /letters/:id/employee-sign` (the actual subject) → `SIGNED`; `signatures` row created
      (`signerRole: 'EMPLOYEE'`); confirmed the "signed copy to HR" `// STUB` log fired; confirmed
      via `GET /letters/:id` that both the CEO's and employee's `signatures` rows and all 6
      `letter_events` rows (SUBMITTED ×2, CHANGES_REQUESTED, CEO_SIGNED, SENT_TO_EMPLOYEE,
      EMPLOYEE_SIGNED) are present in order.
    - Confirmed via `GET /employees/:id/record` that the signed PDF now appears in the subject's
      E-record with `source: 'LETTER'` and `documentTypeName: 'Signed Offer Letter'` — the
      definition-of-done's core "auto-retained in E-record" check.
    - Second full run with the `EXPERIENCE` template and a subject with no dedicated document type
      mapping confirmed the "Other" document-type fallback works (`documentTypeName: 'Other'`).
    - Authorization edge cases: HR calling `ceo-sign` → 403; EMPLOYEE calling
      `POST /letter-templates` → 403; a non-subject employee calling `employee-sign` on someone
      else's letter → 403 (self-only, no bypass); an EMPLOYEE's `GET /letters` only ever returned
      their own letter, confirming the server-side subject filter.
  - Cleaned up afterwards: deleted the `signatures`/`letter_events`/`employee_documents`/`letters`/
    `refresh_tokens`/`users` rows for the 3 disposable accounts, deleted the rendered PDF files
    from `Backend/uploads/letters/`, and deleted the temporary test scripts. Confirmed
    `uploads/letters/` is empty again, `letters`/`letter_events`/`signatures` tables are empty, the
    2 seeded letter templates and all 6 Sprint 1 demo users are untouched.

## Deviations from `API_CONTRACT_SPRINT3.md`

None required by the contract's endpoint/DTO/status-machine shapes. One implementation detail not
specified by the contract, flagged here rather than as a deviation since it doesn't affect any
request/response shape:

- The contract doesn't say which E-record `document_type_id` an auto-filed signed letter should
  use. This implementation maps `OFFER` → "Signed Offer Letter" and `CONTRACT` → "Signed Contract"
  (both already seeded in Sprint 2), and falls back to "Other" for every other template type
  (`REDUNDANCY`, `TERMS_CHANGE`, `WARNING`, and this sprint's `EXPERIENCE`) since there's no
  dedicated document type for those yet. Worth adding an "Experience Certificate"-style mapping
  (the Sprint 2 document types list already has "Experience Certificate" — a close but not
  identical fit to "Experience Letter"; left as "Other" rather than silently repurposing it) if a
  future sprint wants tighter per-type filing.

## What's left for later sprints (Sprint 3 scope)

- Real `puppeteer` + `bodyHtml`/CSS PDF rendering, once B2/B3 (e-signature provider, real letter
  documents) are resolved with the client — the current `pdf-lib` placeholder renderer is designed
  to be swappable without an API change (see scope cut #4).
- Real SMTP delivery for the `send-to-employee` and employee-sign "copy to HR" stubs (needs B8,
  same blocker as Sprint 1's temp-password email).
- Candidate-targeted letters (`letters.candidateId`) and the emailed magic-link signing flow for
  users with no portal account — both explicitly deferred to Sprint 4 once `candidates` exists
  (scope cuts #2/#3).
- `ARCHIVED`/`CANCELLED` letter statuses and an HR-initiated cancel endpoint — modeled in the
  `letters.status` enum per the contract but no endpoint built yet, per the contract's explicit
  "not in this sprint's scope" note.
- Template versioning on edit (`PUT /letter-templates/:id` mutates in place; the contract says
  bumping `version` manually is enough for this sprint, no auto-versioning/history table).
- Automated tests for the new module — none written yet, same gap as Sprints 1/2.
