# BNW OMS — Sprint 4 API Contract (Appraisals)

Shared contract for the Backend (NestJS) and Frontend (React/Vite/TS, `Frontend/vite-ts`) agents.
Both sides must match this exactly. Builds on `API_CONTRACT_SPRINT1.md`/`SPRINT2.md`/`SPRINT3.md`
(still in force — same envelope, auth, roles, camelCase JSON, DB name `BNW`). Scope: the
**employee-initiated quarterly appraisal request flow**, specified directly by the user (this
supersedes the original guide's §3.2/§5.2 cycle-based model — see "Deviation from the original
guide" below).

## The flow, exactly as specified

1. An employee can **request an appraisal** once every 3 months (quarterly). They fill in a
   self-evaluation. The request goes to **their manager** first.
2. The **manager** reviews the self-evaluation, adds **remarks** and a **message**, and
   **accepts or rejects** it.
   - If **rejected**: the flow ends there. The employee (and HR) see it as rejected by the manager.
   - If **accepted**: it moves on to the **CEO**.
3. The **CEO** reviews it, adds their own **remarks** and a **message**, and either
   **accepts**, **rejects**, or **sends it back to the manager** ("continue with that" — same
   send-back-for-another-look shape as the Letter Engine's `CHANGES_REQUESTED`, reusing that
   established pattern rather than inventing a new one).
4. Once the CEO makes a final decision (accept or reject — not "send back"), the result is visible
   to **both HR and the employee's manager** (and the employee themselves, obviously — it's their
   appraisal).

## Deviation from the original guide (flag, don't silently override)

The original guide (§3.2, §5.2) describes an **HR/system-scheduled cycle** model: HR opens a
quarterly cycle, all staff get notified with a due date, staff self-evaluate, THEN manager rates,
THEN CEO approves/rejects, result saved to E-record. This sprint's actual spec, given directly by
the user, is simpler and **employee-initiated**: no cycles, no due dates, no HR-triggered batch —
an employee just clicks "Request appraisal" whenever they're eligible (≥3 months since their last
one). Build **this** (the user's explicit instruction), not the guide's cycle model. Note this
deviation in `BACKEND_STATUS.md`/`FRONTEND_STATUS.md` clearly so it isn't "corrected" back to the
guide's version later without asking.

## New tables

- `appraisal_requests` — `id, employeeId (FK users), selfEvaluation (text), status (enum below),
  managerId (FK users, nullable — snapshot of who the employee's manager was AT SUBMISSION TIME,
  so a later manager reassignment doesn't retroactively change who reviewed a past request),
  managerRemarks (text, nullable), managerMessage (text, nullable), managerDecision (enum:
  ACCEPTED|REJECTED, nullable), managerDecidedAt (timestamp, nullable), ceoRemarks (text,
  nullable), ceoMessage (text, nullable), ceoDecision (enum: ACCEPTED|REJECTED|SEND_BACK,
  nullable), ceoDecidedAt (timestamp, nullable), submittedAt, createdAt, updatedAt`.
- `appraisal_events` — `id, appraisalRequestId (FK), actorId (FK users), action (enum:
  SUBMITTED|MANAGER_ACCEPTED|MANAGER_REJECTED|CEO_ACCEPTED|CEO_REJECTED|CEO_SENT_BACK), message
  (nullable text — mirrors whichever remarks/message was given), createdAt` — append-only audit
  trail, same pattern as `letter_events`.

`appraisal_requests.status` enum: `PENDING_MANAGER | MANAGER_REJECTED | PENDING_CEO |
CEO_ACCEPTED | CEO_REJECTED` — note there is no separate "back with manager" status; a CEO
`SEND_BACK` resets `status` to `PENDING_MANAGER` (clears `managerDecision`/`managerDecidedAt` so
the manager can act again, but the OLD manager remarks/message are preserved in `appraisal_events`,
not overwritten — only the live `managerRemarks`/`managerMessage` columns get cleared for the
manager's next pass; the history stays in the events table).

## Endpoints

| Method | Path | Roles allowed | Notes |
|---|---|---|---|
| POST | `/appraisal-requests` | self (EMPLOYEE and up — anyone with a manager can request one) | `{ selfEvaluation }`. 409 if the caller already has one submitted in the last 3 months (check the most recent `appraisal_requests.submittedAt` for that employee). 400 if the caller has no `managerId` set (can't submit without a manager to review it). |
| GET | `/appraisal-requests/mine` | self | The caller's own appraisal history, newest first. |
| GET | `/appraisal-requests/team` | MANAGER (and HR/ADMIN as a courtesy — see ownership note) | Requests where `managerId` (at submission time) is the caller, `status = PENDING_MANAGER` by default (`?status=` to see others). |
| GET | `/appraisal-requests/pending-ceo` | CEO | `status = PENDING_CEO`. |
| GET | `/appraisal-requests` | HR, ADMIN | All requests, `?status=&employeeId=&page=&limit=` — this is HR's visibility into the whole system per the flow's "lands with HR" requirement. |
| GET | `/appraisal-requests/:id` | HR, ADMIN, CEO, the request's employee, the request's `managerId` | Full detail incl. `events`. |
| POST | `/appraisal-requests/:id/manager-decision` | the request's `managerId` only | `{ remarks, message, decision: 'ACCEPTED' \| 'REJECTED' }`. Only valid when `status = PENDING_MANAGER`, else 409. |
| POST | `/appraisal-requests/:id/ceo-decision` | CEO | `{ remarks, message, decision: 'ACCEPTED' \| 'REJECTED' \| 'SEND_BACK' }`. Only valid when `status = PENDING_CEO`, else 409. |

Eligibility check: `GET /appraisal-requests/mine` response includes a computed
`canRequestNext: boolean` + `nextEligibleDate: string | null` (server computes: last
`submittedAt` + 3 months) so the frontend can show/disable the "Request appraisal" button without
a separate call.

## DTOs

```ts
interface AppraisalEventDto {
  id: number;
  action: 'SUBMITTED' | 'MANAGER_ACCEPTED' | 'MANAGER_REJECTED' | 'CEO_ACCEPTED' | 'CEO_REJECTED' | 'CEO_SENT_BACK';
  actorId: number;
  actorName: string;
  message: string | null;
  createdAt: string;
}

interface AppraisalRequestDto {
  id: number;
  employeeId: number;
  employeeName: string;
  managerId: number | null;
  managerName: string | null;
  selfEvaluation: string;
  status: 'PENDING_MANAGER' | 'MANAGER_REJECTED' | 'PENDING_CEO' | 'CEO_ACCEPTED' | 'CEO_REJECTED';
  managerRemarks: string | null;
  managerMessage: string | null;
  managerDecision: 'ACCEPTED' | 'REJECTED' | null;
  managerDecidedAt: string | null;
  ceoRemarks: string | null;
  ceoMessage: string | null;
  ceoDecision: 'ACCEPTED' | 'REJECTED' | 'SEND_BACK' | null;
  ceoDecidedAt: string | null;
  submittedAt: string;
  events?: AppraisalEventDto[]; // only on GET /appraisal-requests/:id
}

interface MyAppraisalsResponseDto {
  data: AppraisalRequestDto[];
  meta: { canRequestNext: boolean; nextEligibleDate: string | null };
}
```

Authorization: reuse the existing `RolesGuard`/`@Roles()` pattern; the "self/manager-of/CEO"
ownership check for `GET /appraisal-requests/:id` is a new case (not quite like any existing
`assertCanView*`) — write a dedicated `AppraisalsService.assertCanView`, modeled on the existing
ones but for this table's specific role set.

## Addendum (post-launch fix, per user feedback)

Two changes made after the user actually used the feature live:

1. **A MANAGER's own appraisal skips the manager-review stage entirely and goes straight to the
   CEO.** The original flow above assumed every submitter has a manager to review them first — but
   a MANAGER frequently has no `managerId` of their own (confirmed in this app's own seed data:
   `manager@bnw.local` reports to no one), and even when they do, having their own manager rubber-
   stamp it before the CEO does the real review is redundant. Rule: if the submitting user's
   `role === MANAGER`, `POST /appraisal-requests` creates the row with `status = PENDING_CEO`
   directly (skipping `PENDING_MANAGER`), and `managerId` is no longer required to be set for that
   role (still snapshotted if they do have one, for `CEO_SENT_BACK` routing). Every other role is
   unchanged — still needs a `managerId` and still starts at `PENDING_MANAGER`. The CEO is still
   never a submitter (no appraisal for the owner).
   - `ceo-decision`'s `SEND_BACK` option is rejected with 400 if `managerId` is `null` on the
     request (nowhere to send it back to) — CEO must accept or reject instead in that case.
2. **`GET /appraisal-requests/team` now returns full history by default, not just
   `PENDING_MANAGER`.** The original spec's "`status = PENDING_MANAGER` by default" meant a
   manager's own frontend "My Team's Appraisals" tab silently hid every past decision unless a
   specific status was picked one at a time — there was no way to see "all of it". Fixed: no
   `?status=` filter now means all statuses (real history); pass `?status=PENDING_MANAGER` to get
   the old action-items-only view.

## Addendum 2: appraisal-result letters, sent by HR through the Letter Engine

Once an appraisal reaches a final CEO decision, HR sends the employee a letter — reusing the
existing Letter Engine (`docs/API_CONTRACT_SPRINT3.md`) rather than building a separate notification
path. Two new letter types:

- `APPRECIATION` — for `CEO_ACCEPTED`. Body is the **real, owner-provided content** ("Appraisal
  Letter.pdf"), not a placeholder — the one field HR fills manually is `context` (the "[specific
  project, period, or situation]" blank in the original).
- `APPRAISAL_REJECTION` — for `CEO_REJECTED`. No owner-provided wording exists for this one; the
  seeded template is a drafted variant clearly marked `[DRAFT TEMPLATE]` and named "(draft — please
  review wording)" so nobody mistakes it for final copy. HR fills a `feedback` field manually.

Both go through the exact same flow as every other letter type: HR drafts it → CEO e-signs →
HR sends to employee → employee e-signs → auto-filed to their E-record. This is a second,
independent signature step even though the CEO already made the appraisal decision — kept
consistent with how every other letter type works rather than special-casing this one.

Frontend: on the Appraisal detail page, once `status` is `CEO_ACCEPTED` or `CEO_REJECTED`, HR/ADMIN
see a "Send appreciation letter" / "Send outcome letter" button that jumps to New Letter with the
employee and the right template pre-selected (`?subjectUserId=&letterType=`) — still just the
normal New Letter form underneath, nothing bypassed.

## Definition of done

1. An employee (with a manager set) can submit a self-evaluation. Trying again within 3 months is
   blocked (409), with the UI showing why and when they can next request one.
2. Their manager sees it under "my team's appraisals", adds remarks + a message, accepts or
   rejects. A reject ends it there — the employee sees the rejection with the manager's message.
3. On accept, the CEO sees it pending their review, adds remarks + a message, and can accept,
   reject, or send it back to the manager (which puts it back in the manager's queue, and the
   manager sees the CEO's message explaining why).
4. A final CEO decision (accept/reject) is visible to HR (in a full list) and the employee's
   manager (in their team view) — and to the employee themselves on their own appraisal history.
5. Nothing from Sprint 1/2/3 regresses.
