# BNW OMS — Sprint 3 API Contract (Letter Engine)

Shared contract for the Backend (NestJS) and Frontend (React/Vite/TS, `Frontend/vite-ts`) agents.
Both sides must match this exactly. Builds on `API_CONTRACT_SPRINT1.md` and `API_CONTRACT_SPRINT2.md`
(still in force — same envelope, auth, roles, JWT shapes, DB name `BNW`, camelCase JSON over
snake_case columns). Scope: guide §3.3 (H2/H3/H4/H5/H6/H9), §5.1 workflow, §8.1 "Letter engine"
tables (minus `joining_pack_items`/`joining_pack_acks` — those are Sprint 4 "Hiring extras" per
§11, not this sprint), §9 "Templates"/"Letters" rows, §11 Sprint 3.

## Deliberate scope cuts for this sprint (read before building)

1. **Templates are dummy/placeholder content**, per explicit user instruction at project start
   ("for template create dummy then will update according to data"). The guide's §12 blockers B2
   (e-signature provider) and B3 (real letter documents) are still unresolved with the client. Do
   **not** wait on them — seed 2 placeholder templates (`OFFER`, `EXPERIENCE`) with clearly
   placeholder body text and a reasonable `fieldsSchema`, and design the system so swapping in real
   template HTML later is just an update to `letter_templates.bodyHtml`, not a schema change.
2. **Letters go only to existing Users, not candidates.** The guide's H2-H5 flow can target a
   candidate with no account yet (emailed a signing link). Candidates/hiring don't exist until
   Sprint 4 (`cv_batches`/`candidates` tables). This sprint's `letters.subjectUserId` is required
   and always a `users.id` — no `candidateId` column yet (add it in Sprint 4 when candidates exist;
   don't build a nullable placeholder column now).
3. **Employee e-signing happens in-app, not via an emailed magic link.** The guide's H4 has the
   system email the employee a link to sign. Since the "employee" here is always an existing user
   with a portal login (per cut #2), they sign by logging in and opening the pending letter from
   their own dashboard — `POST /letters/:id/employee-sign` is an authenticated endpoint, guarded so
   only `letters.subjectUserId === caller.id` can call it. A real magic-link/candidate-email flow is
   future work once Sprint 4 adds candidates without accounts.
4. **PDF generation is a simple placeholder renderer, not the guide's `puppeteer` HTML→PDF
   pipeline.** Headless Chromium is heavy and unreliable to provision in a sandboxed build
   environment. Backend uses `pdf-lib` to lay out the filled-in field values as plain text on a
   generated PDF page — it will **not** look like a polished letterhead document. This is
   explicitly acceptable for now (dummy templates, dummy rendering) and documented as a known
   follow-up: swap in `puppeteer` + real `bodyHtml`/CSS once real templates arrive from the client.
   `letters.pdfPath` and the `GET /letters/:id/pdf` contract stay the same either way, so this swap
   won't change the API.
5. **"Email" steps are stubs**, same pattern as Sprint 1's temp-password email — log to console with
   a `// STUB` comment, real Nodemailer/SMTP wiring is later (guide §2.2, needs B8 — SMTP sender —
   resolved with the client first).

## New tables (guide §8.1 "Letter engine", entities named to match)

- `letter_templates` — `id, type (enum: OFFER|CONTRACT|REDUNDANCY|TERMS_CHANGE|WARNING|EXPERIENCE),
  name, roleScope (nullable string — "based on role" per guide H2, informational only this sprint,
  not enforced), bodyHtml (text, `{{placeholder}}` syntax), fieldsSchema (jsonb — array of
  `{ key, label, autoFilled: boolean }`; auto-filled fields pull from the employee record e.g.
  `employee.fullName`, manual fields are typed by HR), version (int, default 1), isActive (bool,
  default true), createdAt, updatedAt`.
- `letters` — `id, templateId (FK), type (denormalized copy of the template's type, so it survives
  template edits), subjectUserId (FK users), preparedBy (FK users), fieldValues (jsonb — manual
  field key→value map), pdfPath (nullable — set once first rendered), status (enum below),
  currentVersion (int, default 1), createdAt, updatedAt`.
- `letter_events` — `id, letterId (FK), actorId (FK users), action (enum:
  SUBMITTED|CHANGES_REQUESTED|CEO_SIGNED|SENT_TO_EMPLOYEE|EMPLOYEE_SIGNED|CANCELLED), comment
  (nullable text), createdAt` — an append-only audit trail, one row per status transition; the
  frontend's letter detail page renders this as a timeline.
- `signatures` — `id, letterId (FK), signerId (FK users), signerRole (string, snapshot of the
  signer's role at signing time), signatureText (string — typed name, this sprint's simple in-app
  signature per cut #3 above, no drawn-signature canvas yet), signedAt, ipAddress, userAgent,
  documentHash (sha256 of the letter's field values + template version at signing time, so a later
  edit can't silently invalidate an already-signed record)`.

`letters.status` enum, exactly per guide §5.1: `DRAFT | PENDING_CEO | CHANGES_REQUESTED |
CEO_SIGNED | SENT_TO_EMPLOYEE | SIGNED | ARCHIVED | CANCELLED`.

## Endpoints (guide §9 "Templates" + "Letters" rows)

| Method | Path | Roles allowed | Notes |
|---|---|---|---|
| GET | `/letter-templates` | HR, CEO, ADMIN | `?type=&isActive=`. Returns `{ data: LetterTemplateDto[] }`. |
| POST | `/letter-templates` | ADMIN | Create a template. |
| GET | `/letter-templates/:id` | HR, CEO, ADMIN | Single template. |
| PUT | `/letter-templates/:id` | ADMIN | Full update — creating a new version isn't required this sprint (bump `version` manually if `bodyHtml` changes; letters already generated keep pointing at their original rendered PDF regardless). |
| GET | `/letter-templates/:id/fields` | HR, CEO, ADMIN | Returns just `fieldsSchema` — used by the frontend to build the manual-fields form dynamically. |
| POST | `/letters` | HR, ADMIN | `{ templateId, subjectUserId, fieldValues }`. Creates in `DRAFT`. Auto-fields are resolved server-side from the subject's `UserDto` at render time, not stored in `fieldValues`. |
| GET | `/letters` | HR, CEO, ADMIN, self (subjectUserId, see note) | `?type=&status=&page=&limit=`. A non-HR/CEO/ADMIN caller only ever sees letters where they're the subject (server-side filter, not a query param they control) — this is how an employee sees "letters waiting for my signature" (filter client-side by `status=SENT_TO_EMPLOYEE`). Returns `{ data: LetterDto[], meta: { total, page, limit } }`. |
| GET | `/letters/:id` | HR, CEO, ADMIN, self (if subject) | Full detail incl. `events: LetterEventDto[]` and `signatures: SignatureDto[]`. |
| PATCH | `/letters/:id` | HR, ADMIN | Only while `status = DRAFT` or `CHANGES_REQUESTED` — edit `fieldValues`. 409 otherwise. |
| POST | `/letters/:id/preview` | HR, ADMIN | Renders (or re-renders) the PDF from current `fieldValues` without changing status. Returns `{ data: { pdfUrl } }`. Doesn't require `status = DRAFT` — useful for re-previewing after `CHANGES_REQUESTED`. |
| POST | `/letters/:id/submit-to-ceo` | HR, ADMIN | `DRAFT` or `CHANGES_REQUESTED` → `PENDING_CEO`. Logs a `SUBMITTED` event. |
| POST | `/letters/:id/request-changes` | CEO | `{ comment }` (required). `PENDING_CEO` → `CHANGES_REQUESTED`. Logs event with the comment. |
| POST | `/letters/:id/ceo-sign` | CEO | `{ signatureText }`. `PENDING_CEO` → `CEO_SIGNED`. Creates a `signatures` row (`signerRole: 'CEO'`), logs `CEO_SIGNED` event. |
| POST | `/letters/:id/send-to-employee` | HR, ADMIN | `CEO_SIGNED` → `SENT_TO_EMPLOYEE`. Stub-"emails" the subject (console log, `// STUB`). Logs event. |
| POST | `/letters/:id/employee-sign` | self only (`subjectUserId === caller.id`) | `{ signatureText }`. `SENT_TO_EMPLOYEE` → `SIGNED`. Creates a `signatures` row (`signerRole` = subject's actual role), logs `EMPLOYEE_SIGNED` event, stub-"emails" HR the signed copy, and files the rendered PDF into the subject's E-record (`employee_documents`, `source: 'LETTER'`) — this is the guide's U5 "auto-retained in E-record" behavior, reuse Sprint 2's `EmployeeDocument` entity/service rather than duplicating file-storage logic. |
| GET | `/letters/:id/pdf` | HR, CEO, ADMIN, self (if subject) | Streams the current rendered PDF. 404 if never rendered (`pdfPath` null — call `/preview` first). |

`ARCHIVED`/`CANCELLED` transitions and any HR-initiated cancel action are **not** in this sprint's
scope — flag as future work in the status doc, don't build a `/cancel` endpoint speculatively.

## DTOs

```ts
interface LetterFieldSchemaEntry {
  key: string;
  label: string;
  autoFilled: boolean;
}

interface LetterTemplateDto {
  id: number;
  type: 'OFFER' | 'CONTRACT' | 'REDUNDANCY' | 'TERMS_CHANGE' | 'WARNING' | 'EXPERIENCE';
  name: string;
  roleScope: string | null;
  fieldsSchema: LetterFieldSchemaEntry[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // bodyHtml intentionally omitted from the list/detail DTO — it's template source, not needed by
  // the letter-creation UI (which only needs fieldsSchema) or the letter detail UI (which needs
  // the rendered PDF, not the raw HTML). Add a dedicated endpoint later if a template editor UI
  // needs to read/edit bodyHtml directly.
}

interface LetterEventDto {
  id: number;
  action: 'SUBMITTED' | 'CHANGES_REQUESTED' | 'CEO_SIGNED' | 'SENT_TO_EMPLOYEE' | 'EMPLOYEE_SIGNED' | 'CANCELLED';
  actorId: number;
  actorName: string;
  comment: string | null;
  createdAt: string;
}

interface SignatureDto {
  id: number;
  signerId: number;
  signerName: string;
  signerRole: string;
  signedAt: string;
}

interface LetterDto {
  id: number;
  templateId: number;
  templateName: string;
  type: 'OFFER' | 'CONTRACT' | 'REDUNDANCY' | 'TERMS_CHANGE' | 'WARNING' | 'EXPERIENCE';
  subjectUserId: number;
  subjectName: string;
  preparedBy: number;
  preparedByName: string;
  fieldValues: Record<string, string>;
  status: 'DRAFT' | 'PENDING_CEO' | 'CHANGES_REQUESTED' | 'CEO_SIGNED' | 'SENT_TO_EMPLOYEE' | 'SIGNED' | 'ARCHIVED' | 'CANCELLED';
  hasPdf: boolean;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  events?: LetterEventDto[]; // only on GET /letters/:id, not the list
  signatures?: SignatureDto[]; // only on GET /letters/:id
}
```

Authorization: reuse the existing `RolesGuard`/`@Roles()` pattern. The "self if subject" cases
need a new ownership check (`LettersService.assertCanView`, analogous to Sprint 2's
`UsersService.assertCanViewRecord`) — don't duplicate the pattern differently.

## Seed data (dummy templates, per scope cut #1)

`npm run seed` (extend, idempotently, same pattern as Sprint 1/2) adds two `letter_templates`:

- `OFFER`: name "Offer Letter (placeholder)", `fieldsSchema`:
  `[{key:"employee.fullName",label:"Employee name",autoFilled:true}, {key:"employee.designation",label:"Designation",autoFilled:true}, {key:"salary",label:"Monthly salary",autoFilled:false}, {key:"startDate",label:"Start date",autoFilled:false}]`,
  `bodyHtml` clearly marked as placeholder text (e.g. starts with
  `<p><em>[PLACEHOLDER TEMPLATE — replace with real offer letter content]</em></p>`).
- `EXPERIENCE`: name "Experience Letter (placeholder)", similar shape, fields for
  `employee.fullName`, `employee.designation`, `startDate`, `endDate`.

## Definition of done for Sprint 3

1. HR creates a DRAFT offer letter for a seeded employee, fills the manual fields, previews the
   (placeholder-rendered) PDF.
2. HR submits to CEO. Logged in as CEO, sees it in a "pending my review" list, can request changes
   (goes back to HR with a comment) or sign it.
3. After CEO signs, HR sends it to the employee. Logged in as that employee, sees the letter
   waiting for their signature, signs it in-app (typed name).
4. After the employee signs: the letter's status is `SIGNED`, a `signatures` row exists for both
   CEO and employee, and the rendered PDF now also shows up in that employee's E-record
   (Sprint 2's `/employees/:id/record` — confirms the auto-filing integration actually works, not
   just that the letter table has the right status).
5. Nothing from Sprint 1/2 regresses.
