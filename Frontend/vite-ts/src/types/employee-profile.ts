// ----------------------------------------------------------------------
// BNW OMS — Gap-fix types, mirroring docs/API_CONTRACT_GAPS_FIX.md exactly (Gap 1 —
// `employee_profiles`). Keep in sync with that file; if either side needs to change this shape,
// update the contract doc first. Companion to src/types/user.ts, src/types/employee-record.ts.

export type EmployeeProfileGender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export const EMPLOYEE_PROFILE_GENDER_OPTIONS: { value: EmployeeProfileGender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

/**
 * `EmployeeProfileDto` — contract Gap 1. One row per user, all fields nullable (filled in over
 * time, not required at account creation). `GET /users/:id/profile` returns `{ data:
 * EmployeeProfileDto | null }` — `null` if the employee has never filled one in (no auto-created
 * empty row).
 */
export interface EmployeeProfileDto {
  userId: number;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null; // ISO date
  gender: EmployeeProfileGender | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  nationalId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  updatedAt: string | null;
}

/**
 * `UpdateEmployeeProfileDto` — `PATCH /users/:id/profile` request body. Partial update semantics
 * (upserts server-side on first write) — every field optional, the form never blocks on empty
 * fields.
 */
export type UpdateEmployeeProfileDto = Partial<Omit<EmployeeProfileDto, 'userId' | 'updatedAt'>>;
