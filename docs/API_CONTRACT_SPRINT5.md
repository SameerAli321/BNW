# BNW OMS — Sprint 5 API Contract (Hiring: candidates, CV upload, convert-to-employee, joining pack)

Shared contract for the Backend (NestJS) and Frontend (React/Vite/TS, `Frontend/vite-ts`) agents.
Both sides must match this exactly. Builds on `API_CONTRACT_SPRINT1.md`–`SPRINT4.md` (still in
force — same envelope, auth, roles, camelCase JSON, DB name `BNW`). Scope: original guide §3.3
H1–H10 (Hiring & Contracts), minus the letter-engine parts already built in Sprint 3.

## Deviation from the original guide (flag, don't silently override)

The guide's hiring flow (§3.3 H2–H6, and its own open question at the bottom: "Do offer letters go
to candidates (no account yet) or only to existing users? *(Assumed: candidates, via a secure email
link.)*") assumes a candidate can receive and e-sign an offer/contract letter **before** they have a
BNW OMS account, via an emailed secure link. We do not have passwordless/public auth or real SMTP
built (both are still open items — see `PROJECT_GUIDE.md` §5), and building a whole new
unauthenticated signing portal is a much bigger scope than "add a Hiring module."

**This sprint's flow instead:** HR bulk-uploads CVs → candidates list → HR shortlists/manages
status → **HR converts a candidate into a real employee account** (this is new) → HR then uses the
**already-built Letter Engine** (Sprint 3) to send that new employee an OFFER or CONTRACT letter,
exactly the same draft → CEO sign → send-to-employee → e-sign → E-record flow every other letter
type already uses. No new signing infrastructure. Revisit true pre-account candidate signing once
real SMTP/passwordless auth is in scope.

## New tables

- `candidates` — `id, name, email, phone (nullable), cvFilePath, cvOriginalName, cvMime, cvSize,
  status (enum below), convertedUserId (FK users, nullable), uploadedBy (FK users), createdAt,
  updatedAt`. No separate `cv_batches` table (guide's schema sketch) — "bulk upload" just means one
  `POST` creates N candidate rows in one request; nothing in scope needs batch-level aggregates.
- `joining_pack_items` — `id, title, description (nullable text), kind (enum:
  OPERATING_GUIDE|TEAM_INTRO|POLICY_NOTE), isActive (default true), createdAt, updatedAt`.
  Admin/HR-managed, same CRUD shape as `letter_templates` (no versioning needed — these are simple
  read-and-acknowledge documents, not signed/merged like letters).
- `joining_pack_acks` — `id, userId (FK users), itemId (FK joining_pack_items), acknowledgedAt`.
  Unique on `(userId, itemId)` — acknowledging twice just no-ops (idempotent, same pattern as
  `letter_events`/`appraisal_events` idempotency elsewhere).

`candidates.status` enum: `NEW | SHORTLISTED | OFFERED | HIRED | REJECTED` (per guide's own
`candidates.status` column). HR sets `OFFERED` manually once they've sent an offer letter through
the Letter Engine (no automatic linkage between a `Letter` row and a `Candidate` row — out of scope
for this pass); `HIRED` is set automatically by the convert endpoint.

## Endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/candidates/bulk-upload` | HR, ADMIN | Multipart, field `files` (multiple, PDF only, reuse `MAX_DOCUMENT_SIZE_BYTES`/PDF-only filter pattern from `employee-documents.storage.ts`). One `Candidate` row per file, `status = NEW`, `name` defaulted from the filename (HR edits it after). Returns the created candidates. |
| GET | `/candidates` | HR, ADMIN | `?status=&q=&page=&limit=` — `q` matches name/email like the Users list. |
| GET | `/candidates/:id` | HR, ADMIN | Detail. |
| PATCH | `/candidates/:id` | HR, ADMIN | `{ name?, email?, phone?, status? }` — manual status changes (e.g. `SHORTLISTED`, `REJECTED`, or HR marking `OFFERED` after sending the letter). 409 if trying to set `status` on an already-`HIRED` candidate (that transition only happens via `/convert`). |
| GET | `/candidates/:id/cv` | HR, ADMIN | Downloads the CV file — same streamed-file-response pattern as `GET /documents/:id/download`. |
| POST | `/candidates/:id/convert` | HR, ADMIN | Body is `CreateUserDto` (same shape as `POST /users`, including the now-mandatory `password` — see gap-fix/user-management history) minus `email`/`firstName`/`lastName` (defaulted from the candidate's own `name`/`email`, HR can override). 409 if `candidate.status === 'HIRED'` (already converted) or the candidate's email collides with an existing user (same check `UsersService.create` already does). On success: creates the `User` exactly like `POST /users` does, sets `candidate.status = 'HIRED'` and `candidate.convertedUserId`. Returns `{ candidate, user }`. |
| GET | `/joining-pack-items` | any authenticated | Returns each active item plus `acknowledged: boolean` / `acknowledgedAt` computed for the caller (left join against `joining_pack_acks` for `caller.sub`). |
| POST | `/joining-pack-items` | HR, ADMIN | `{ title, description?, kind }`. |
| PATCH | `/joining-pack-items/:id` | HR, ADMIN | Partial update, same shape, plus `isActive`. |
| POST | `/joining-pack-items/:id/acknowledge` | any authenticated | "I have read this." Idempotent — upserts the `(userId, itemId)` ack row; re-acknowledging just returns the existing `acknowledgedAt` unchanged. |

Existing document-request checklist (H7) is **not duplicated** here — it's the Sprint 2 E-record
feature (`POST /employees/:id/documents-requests`, already built). Once HR converts a candidate,
they use that existing feature on the new employee's E-record page to request onboarding documents
(photo ID, degree certs, etc. from the existing `document_types` dropdown) — no new endpoint.

## DTOs

```ts
interface CandidateDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cvOriginalName: string;
  status: 'NEW' | 'SHORTLISTED' | 'OFFERED' | 'HIRED' | 'REJECTED';
  convertedUserId: number | null;
  uploadedBy: number;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

interface ConvertCandidateDto {
  role: RoleName;
  password: string; // min 8, mandatory — matches POST /users
  managerId?: number | null;
  departmentId?: number | null;
  designation?: string | null;
  joinDate?: string | null;
  employeeCode?: string | null;
  // name/email default from the candidate row; only send these to override:
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface JoiningPackItemDto {
  id: number;
  title: string;
  description: string | null;
  kind: 'OPERATING_GUIDE' | 'TEAM_INTRO' | 'POLICY_NOTE';
  isActive: boolean;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}
```

## Frontend

- New nav item **"Hiring"** (HR/ADMIN only, `allowedRoles: ['HR', 'ADMIN']`), positioned near
  "Staff Summary" — a Candidates list (search/status filter/pagination, matching the Users list
  table pattern) with a "Bulk upload CVs" action (multi-file picker) and a "Convert to employee"
  action per row (opens a form reusing the same fields as `UserNewEditForm`'s create mode, minus
  the fields defaulted from the candidate).
- **Joining pack**: a simple page (or a section on the employee's own Account/My E-record area)
  listing active items with a checkbox/button "I have read this" per item, calling the acknowledge
  endpoint — visible to every role (not HR/ADMIN-gated), since every employee needs to see and
  acknowledge their own joining pack. Admin/HR manage the items themselves from a small CRUD screen
  under the same "Hiring" nav section.

## Definition of done

1. HR bulk-uploads several PDF CVs in one action → candidates appear in the list as `NEW`.
2. HR can search/filter candidates, edit their details, and manually move status forward (e.g. to
   `SHORTLISTED`).
3. HR converts a candidate to an employee (sets a password, role, department, manager) → a real
   user account is created, login works with that password, the candidate shows `HIRED` and links
   to the new user.
4. HR can then go to Letters → New letter → pick that new employee → send them an OFFER or
   CONTRACT letter through the existing, unmodified Letter Engine flow.
5. HR/Admin create joining-pack items (Operating guide, Team intro, Policy notes); any employee can
   see them and acknowledge each one; re-acknowledging doesn't create duplicate rows.
6. Nothing from Sprints 1–4 regresses.
