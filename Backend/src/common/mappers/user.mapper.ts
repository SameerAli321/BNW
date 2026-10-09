import { User } from '../../entities/user.entity';
import { EmployeeProfile } from '../../entities/employee-profile.entity';

export interface UserDto {
  id: number;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  managerId: number | null;
  managerName?: string | null;
  departmentId: number | null;
  departmentName?: string | null;
  designation: string | null;
  status: string;
  joinDate: string | null;
  leavingDate: string | null;
  /** Relative to the API base, e.g. '/users/avatars/<uuid>.jpg' — null when no picture. */
  avatarUrl: string | null;
  mustChangePassword: boolean;
  /** Opted in to a notification for every new request (HR / Admin / CEO). */
  notifyAllRequests: boolean;
  createdAt: string;
  updatedAt: string;
  // From employee_profiles — only present when the profile was loaded (see `profile` option).
  contactNumber?: string | null;
  cnic?: string | null;
  // Compensation — only present for HR / ADMIN callers (see `includeCompensation`).
  currentSalary?: number | null;
  previousSalary?: number | null;
  deductionPolicy?: string | null;
  lastSalaryChangeDate?: string | null;
}

export type UserDtoOptions = {
  /** Adds contactNumber / cnic. Pass `null` when the user has no profile row yet. */
  profile?: EmployeeProfile | null;
  /** Adds the salary fields. Only ever true for HR / ADMIN callers. */
  includeCompensation?: boolean;
};

/** Roles allowed to see salary fields on a user. */
export const COMPENSATION_VIEWER_ROLES = ['HR', 'ADMIN'];

/**
 * Maps a User entity to the API's UserDto shape (per API_CONTRACT_SPRINT1.md).
 * Never includes password_hash. manager/department relations are optional — include them
 * with `{ relations: ['manager', 'department'] }` on the query to populate the *Name fields.
 * Salary fields are left out unless `includeCompensation` is set.
 */
export function toUserDto(user: User, options: UserDtoOptions = {}): UserDto {
  const dto: UserDto = {
    id: user.id,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    managerId: user.managerId,
    managerName: user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : null,
    departmentId: user.departmentId,
    departmentName: user.department ? user.department.name : null,
    designation: user.designation,
    status: user.status,
    joinDate: user.joinDate,
    leavingDate: user.leavingDate ?? null,
    avatarUrl: user.avatarPath ? `/users/avatars/${user.avatarPath}` : null,
    mustChangePassword: user.mustChangePassword,
    notifyAllRequests: !!user.notifyAllRequests,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
  if (options.profile !== undefined) {
    dto.contactNumber = options.profile?.phone ?? null;
    dto.cnic = options.profile?.nationalId ?? null;
  }
  if (options.includeCompensation) {
    dto.currentSalary = user.currentSalary ?? null;
    dto.previousSalary = user.previousSalary ?? null;
    dto.deductionPolicy = user.deductionPolicy ?? null;
    dto.lastSalaryChangeDate = user.lastSalaryChangeDate ?? null;
  }
  return dto;
}
