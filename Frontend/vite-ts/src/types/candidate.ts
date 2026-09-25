import type { UserRole } from './user';

// ----------------------------------------------------------------------
// BNW OMS — Sprint 5 types (Hiring: candidates, bulk CV upload, convert-to-employee, joining
// pack), mirroring docs/API_CONTRACT_SPRINT5.md exactly. Keep in sync with the contract; if
// either side needs to change this shape, update the contract doc first. Companion file to
// src/types/user.ts (candidate -> user is the convert flow), not merged into it.

export type CandidateStatus = 'NEW' | 'SHORTLISTED' | 'OFFERED' | 'HIRED' | 'REJECTED';

export const CANDIDATE_STATUS_OPTIONS: CandidateStatus[] = [
  'NEW',
  'SHORTLISTED',
  'OFFERED',
  'HIRED',
  'REJECTED',
];

/** `CandidateDto` — contract §DTOs. */
export interface CandidateDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cvOriginalName: string;
  status: CandidateStatus;
  convertedUserId: number | null;
  uploadedBy: number;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

/** `PATCH /candidates/:id` body — contract §Endpoints. 409 if the candidate is already `HIRED`. */
export type UpdateCandidateDto = {
  name?: string;
  email?: string;
  phone?: string | null;
  status?: CandidateStatus;
};

/**
 * `ConvertCandidateDto` — contract §DTOs, `POST /candidates/:id/convert` body. Same shape as
 * `CreateUserDto` (see src/types/user.ts) minus `email`/`firstName`/`lastName`, which default
 * from the candidate row and are only sent here to override.
 */
export type ConvertCandidateDto = {
  role: UserRole;
  password: string; // min 8, mandatory — matches POST /users
  managerId?: number | null;
  departmentId?: number | null;
  designation?: string | null;
  joinDate?: string | null;
  employeeCode?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
};

/** `POST /candidates/:id/convert` response — contract §Endpoints: `{ candidate, user }`. */
export type ConvertCandidateResponse = {
  candidate: CandidateDto;
  user: { id: number; firstName: string; lastName: string; email: string };
};

export type ICandidateListMeta = { total: number; page: number; limit: number };

export type ICandidateTableFilters = { name: string; status: string };

// ----------------------------------------------------------------------
// Joining pack

export type JoiningPackItemKind = 'OPERATING_GUIDE' | 'TEAM_INTRO' | 'POLICY_NOTE';

export const JOINING_PACK_ITEM_KIND_OPTIONS: { value: JoiningPackItemKind; label: string }[] = [
  { value: 'OPERATING_GUIDE', label: 'Operating guide' },
  { value: 'TEAM_INTRO', label: 'Team intro' },
  { value: 'POLICY_NOTE', label: 'Policy note' },
];

/** `JoiningPackItemDto` — contract §DTOs. `acknowledged`/`acknowledgedAt` are computed per-caller. */
export interface JoiningPackItemDto {
  id: number;
  title: string;
  description: string | null;
  kind: JoiningPackItemKind;
  isActive: boolean;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

/** `POST /joining-pack-items` body — HR, ADMIN. */
export type CreateJoiningPackItemDto = {
  title: string;
  description?: string | null;
  kind: JoiningPackItemKind;
};

/** `PATCH /joining-pack-items/:id` body — HR, ADMIN. Partial, plus `isActive`. */
export type UpdateJoiningPackItemDto = Partial<CreateJoiningPackItemDto> & {
  isActive?: boolean;
};
