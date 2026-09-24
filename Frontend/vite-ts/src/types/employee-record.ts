import type { UserDto, UserRole, UserAccountStatus } from './user';

// ----------------------------------------------------------------------
// BNW OMS — Sprint 2 types, mirroring docs/API_CONTRACT_SPRINT2.md exactly (E-record & Staff
// summary). Keep in sync with that file; if either side needs to change this shape, update the
// contract doc first. Companion to src/types/user.ts (Sprint 1).

/** `DocumentTypeDto` — contract §DTOs. `GET /document-types` (any authenticated user). */
export interface DocumentTypeDto {
  id: number;
  name: string;
}

export type EmployeeDocumentSource = 'UPLOAD' | 'LETTER' | 'CONTRACT' | 'APPRAISAL' | 'CV';

/** `EmployeeDocumentDto` — contract §DTOs. One row of an employee's E-record document list. */
export interface EmployeeDocumentDto {
  id: number;
  userId: number;
  documentTypeId: number;
  documentTypeName: string;
  originalName: string;
  mime: string;
  size: number;
  source: EmployeeDocumentSource;
  uploadedBy: number;
  uploadedByName: string;
  createdAt: string;
}

export type DocumentRequestStatus = 'REQUESTED' | 'RECEIVED';

/** `DocumentRequestDto` — contract §DTOs. */
export interface DocumentRequestDto {
  id: number;
  userId: number;
  documentTypeId: number;
  documentTypeName: string;
  requestedBy: number;
  status: DocumentRequestStatus;
  dueDate: string | null;
  createdAt: string;
}

/**
 * `StaffSummaryRowDto` — contract §DTOs. A flattened, lightweight overview row (NOT the full
 * `UserDto`) — the Staff Summary table is an overview list, not the Sprint 1 Users CRUD table.
 */
export interface StaffSummaryRowDto {
  id: number;
  employeeCode: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  departmentName: string | null;
  designation: string | null;
  managerName: string | null;
  status: UserAccountStatus;
  joinDate: string | null;
  documentCount: number;
}

/** `GET /employees/:id/record` response payload shape (contract §Endpoints). */
export type EmployeeRecordDto = {
  user: UserDto;
  documents: EmployeeDocumentDto[];
  documentRequests: DocumentRequestDto[];
};

export type IStaffSummaryListMeta = { total: number; page: number; limit: number };

export type IStaffSummaryTableFilters = {
  name: string;
  departmentId: string;
  role: string;
  status: string;
};
