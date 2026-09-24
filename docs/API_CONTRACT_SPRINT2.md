# BNW OMS — Sprint 2 API Contract (E-record & Staff Summary)

Shared contract for the Backend (NestJS) and Frontend (React/Vite/TS, `Frontend/vite-ts`) agents.
Both sides must match this exactly. Builds on `docs/API_CONTRACT_SPRINT1.md` (still in force —
same envelope, auth, roles, JWT shapes, DB name `BNW`, camelCase JSON over snake_case columns).
Scope: guide §3.1 (U4 Staff Database summary, U5 Employee E-record), §8.1 "E-record & documents"
tables, §9 E-record/Staff summary endpoints, §11 Sprint 2.

## What this sprint adds

An **E-record** is a per-employee document repository (CVs, signed letters, contracts, approved
appraisals — later sprints will start feeding documents into it automatically; for now HR/Admin
upload documents manually against an employee). A **staff summary** is a single searchable table
of all employees for CEO/HR/Admin, per guide U4.

## New tables (guide §8.1 "E-record & documents", translated to TypeORM entities per
`API_CONTRACT_SPRINT1.md`'s camelCase-JSON/snake_case-columns rule — same pattern as Sprint 1's
`User`/`Role`/`Department`)

- `document_types` — `id, name` (seed a starter list: `CV`, `Photo ID`, `ID Card`,
  `Experience Certificate`, `Degree Certificate`, `Signed Offer Letter`, `Signed Contract`,
  `Appraisal Record`, `Other`).
- `employee_documents` — `id, user_id (FK users), document_type_id (FK document_types), file_path,
  original_name, mime, size, source (enum: UPLOAD|LETTER|CONTRACT|APPRAISAL|CV — Sprint 2 only
  ever writes UPLOAD; the others are reserved for later sprints' auto-filing), uploaded_by (FK
  users), created_at`. No soft delete needed for Sprint 2 (documents aren't edited/removed by
  users in this slice — deletion, if added, is an Admin-only hard action, not in scope yet).
- `document_requests` — `id, user_id (FK users), document_type_id (FK document_types), requested_by
  (FK users), status (enum: REQUESTED|RECEIVED), due_date (nullable date), created_at, updated_at`.
  Modeled now (guide H7 will use it in the Sprint 4 hiring flow) but Sprint 2 only needs
  create/list — no "fulfil" workflow yet.

File storage: local disk, `Backend/uploads/employee-documents/` (git-ignored, same pattern the
guide's §2.2/§7 specifies), filename randomized server-side, original name kept in
`employee_documents.original_name`. Max upload size 10MB, allowed mime types: `application/pdf`,
`image/png`, `image/jpeg`, `application/msword`,
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

## Endpoints (guide §9 "E-record" + "Staff summary" rows)

| Method | Path | Roles allowed | Notes |
|---|---|---|---|
| GET | `/employees/:id/record` | HR, ADMIN, CEO, self, manager-of | Returns `{ data: { user: UserDto, documents: EmployeeDocumentDto[], documentRequests: DocumentRequestDto[] } }`. |
| POST | `/employees/:id/documents` | HR, ADMIN | `multipart/form-data`: `file` + `documentTypeId`. Returns the created `EmployeeDocumentDto`. |
| GET | `/documents/:id/download` | HR, ADMIN, CEO, self (if document belongs to them), manager-of | Streams the file (`Content-Disposition: attachment`). 404 if the document doesn't exist, 403 if the caller isn't authorized for that employee. |
| GET | `/document-types` | any authenticated | `{ data: DocumentTypeDto[] }`. |
| POST | `/employees/:id/document-requests` | HR, ADMIN | `{ documentTypeId, dueDate? }`. Returns the created `DocumentRequestDto`. |
| GET | `/staff-summary` | HR, CEO, ADMIN | Query: `?q=&departmentId=&role=&status=&page=&limit=`. Returns `{ data: StaffSummaryRowDto[], meta: { total, page, limit } }`. |
| GET | `/staff-summary/export` | HR, CEO, ADMIN | Returns a CSV file (`Content-Type: text/csv`, `Content-Disposition: attachment; filename="staff-summary.csv"`) of the same filtered rows — no pagination on export, filters still apply. |

## DTOs

```ts
interface DocumentTypeDto {
  id: number;
  name: string;
}

interface EmployeeDocumentDto {
  id: number;
  userId: number;
  documentTypeId: number;
  documentTypeName: string; // joined, avoids a second round-trip on the E-record screen
  originalName: string;
  mime: string;
  size: number;
  source: 'UPLOAD' | 'LETTER' | 'CONTRACT' | 'APPRAISAL' | 'CV';
  uploadedBy: number;
  uploadedByName: string;
  createdAt: string;
}

interface DocumentRequestDto {
  id: number;
  userId: number;
  documentTypeId: number;
  documentTypeName: string;
  requestedBy: number;
  status: 'REQUESTED' | 'RECEIVED';
  dueDate: string | null;
  createdAt: string;
}

// One row of the staff summary table — a flattened view of UserDto plus a document count,
// intentionally NOT the full UserDto (staff summary is a lightweight overview list, not the
// Users CRUD table from Sprint 1 — reuse the Sprint 1 Users list for anything needing full detail).
interface StaffSummaryRowDto {
  id: number;
  employeeCode: string | null;
  fullName: string; // firstName + ' ' + lastName, joined server-side
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'CEO' | 'PAYROLL' | 'ADMIN';
  departmentName: string | null;
  designation: string | null;
  managerName: string | null;
  status: 'ONBOARDING' | 'ACTIVE' | 'INACTIVE';
  joinDate: string | null;
  documentCount: number;
}
```

Authorization: reuse Sprint 1's `RolesGuard`/`@Roles()` pattern and the `self`/`manager-of`
ownership-check helper already in `UsersService` — extend/reuse it, don't duplicate the logic.

## Definition of done for Sprint 2

1. HR/Admin can open an employee's E-record page, upload a document against a document type, see
   it listed, and download it back.
2. HR/CEO/Admin can open the Staff Summary page, search/filter, and export a CSV.
3. An Employee hitting `/employees/:id/record` for **another** employee gets a 403; for their own
   `id`, they can view (read-only — no upload button, matches guide §4's permissions table) but not
   upload/request documents (HR/Admin only, per the endpoint table above).
4. Nothing from Sprint 1 regresses — Users CRUD, login, RBAC all still work exactly as before.
