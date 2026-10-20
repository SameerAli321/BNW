import type { IDateValue, ISocialLink } from './common';

// ----------------------------------------------------------------------
// BNW OMS — real API types, mirroring docs/API_CONTRACT_SPRINT1.md exactly. Keep in sync with
// that file; if either side needs to change this shape, update the contract doc first.

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'CEO' | 'PAYROLL' | 'ADMIN';

export const USER_ROLE_OPTIONS: UserRole[] = [
  'EMPLOYEE',
  'MANAGER',
  'HR',
  'CEO',
  'PAYROLL',
  'ADMIN',
];

/**
 * Every role HR / Admin can pick for an existing user (Edit User, Hiring → Convert), each stored as
 * an existing system role. Team Member is EMPLOYEE, Team Lead is MANAGER.
 */
export const USER_FORM_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'CEO', label: 'CEO' },
  { value: 'HR', label: 'HR' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Team Lead' },
  { value: 'EMPLOYEE', label: 'Team Member' },
];

/**
 * The Role dropdown on Create User (Admin only). No Team Member — regular employees and interns
 * come in through Hiring → Convert.
 */
export const USER_CREATE_ROLE_OPTIONS = USER_FORM_ROLE_OPTIONS.filter(
  (option) => option.value !== 'EMPLOYEE'
);

const OLDER_ROLE_LABELS: Partial<Record<UserRole, string>> = {
  PAYROLL: 'Payroll (older role)',
};

/** 'MANAGER' → 'Team Lead' etc. */
export function userRoleLabel(role: string): string {
  return (
    USER_FORM_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    OLDER_ROLE_LABELS[role as UserRole] ??
    role
  );
}

// How the person is employed — interns are users with INTERN here.
export type EmploymentType = 'PERMANENT' | 'CONTRACT' | 'PROBATION' | 'INTERN';

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'INTERN', label: 'Intern' },
];

/** 'INTERN' → 'Intern' etc. */
export function employmentTypeLabel(type?: string | null): string {
  if (!type) return '';
  return EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

/**
 * Which company the person works for — the bands on the Team Hierarchy chart. HR / Administration
 * is one team shared across BNW and Hayes.
 */
export type Company = 'BNW' | 'HAYES' | 'SHARED';

export const COMPANY_OPTIONS: { value: Company; label: string }[] = [
  { value: 'BNW', label: 'BNW' },
  { value: 'HAYES', label: 'Hayes' },
  { value: 'SHARED', label: 'HR / Administration (shared BNW & Hayes)' },
];

/** 'SHARED' → 'HR / Administration (shared BNW & Hayes)' etc. */
export function companyLabel(company?: string | null): string {
  if (!company) return '';
  return COMPANY_OPTIONS.find((option) => option.value === company)?.label ?? company;
}

/** The Department dropdown when creating / editing a user (client's list, in this order). */
export const USER_FORM_DEPARTMENTS = ['Personalised', 'Generalised', 'HR', 'Operations'];

// New users start ACTIVE. INACTIVE = no longer with the company — they can no longer sign in.
export type UserAccountStatus = 'ACTIVE' | 'INACTIVE';

export const USER_ACCOUNT_STATUS_OPTIONS: { value: UserAccountStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export function userStatusLabel(status: string): string {
  return USER_ACCOUNT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

/** `UserDto` — contract §"Auth", used in login/me responses and the Users list/detail. */
export interface UserDto {
  id: number;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  managerId: number | null;
  managerName?: string | null;
  departmentId: number | null;
  departmentName?: string | null;
  designation: string | null;
  status: UserAccountStatus;
  employmentType: EmploymentType;
  company: Company;
  joinDate: string | null; // ISO date
  leavingDate: string | null; // ISO date
  /** Profile picture, relative to the API base — use `avatarSrc()` from actions/users. */
  avatarUrl: string | null;
  mustChangePassword: boolean;
  /** Opted in to a notification (in-app + email) for every new request — HR / ADMIN / CEO. */
  notifyAllRequests?: boolean;
  createdAt: string;
  updatedAt: string;
  // From the employee profile (present on the Users list / detail / E-record).
  contactNumber?: string | null;
  cnic?: string | null;
  // Salary — only sent by the backend to HR / ADMIN.
  currentSalary?: number | null;
  previousSalary?: number | null;
  deductionPolicy?: string | null;
  lastSalaryChangeDate?: string | null;
}

/**
 * `CreateUserDto` — contract §"Users". `password` is required: HR/ADMIN set the exact password for
 * the new user up front (no more server-generated fallback).
 */
export type CreateUserDto = {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  managerId?: number | null;
  departmentId?: number | null;
  designation?: string | null;
  joinDate?: string | null;
  employeeCode?: string | null;
  status?: UserAccountStatus;
  employmentType?: EmploymentType;
  company?: Company;
  leavingDate?: string | null;
  contactNumber?: string | null;
  cnic?: string | null;
  currentSalary?: number | null;
  previousSalary?: number | null;
  deductionPolicy?: string | null;
  lastSalaryChangeDate?: string | null;
  password: string;
};

/**
 * `UpdateUserDto` — contract §"Users": same fields, all optional, plus `status`. `password` lets
 * HR/ADMIN directly set a user's password from the Edit User form (min 8 chars) as an alternative
 * to the random-generated `POST /users/:id/reset-password` action.
 */
export type UpdateUserDto = Partial<CreateUserDto> & {
  status?: UserAccountStatus;
  password?: string;
};

export type IDepartment = { id: number; name: string };

export type IUserListMeta = { total: number; page: number; limit: number };

export type IUserTableFilters = {
  name: string;
  role: string[];
  status: string;
  employmentType: string;
};

/** GET /users/hierarchy — one person on the Team Hierarchy page (no email / salary / CNIC). */
export type IHierarchyNode = {
  id: number;
  name: string;
  designation: string | null;
  role: UserRole;
  departmentName: string | null;
  managerId: number | null;
  avatarUrl: string | null;
  employmentType: EmploymentType;
  company: Company;
};

/**
 * Alias kept so the pre-existing Users module UI (table/forms, from the minimal-kit demo)
 * didn't need a full rename when rewired to the real API — `IUserItem` is exactly `UserDto`.
 */
export type IUserItem = UserDto;

export type IUserProfileCover = {
  name: string;
  role: string;
  coverUrl: string;
  avatarUrl: string;
};

export type IUserProfile = {
  id: string;
  role: string;
  quote: string;
  email: string;
  school: string;
  country: string;
  company: string;
  totalFollowers: number;
  totalFollowing: number;
  socialLinks: ISocialLink;
};

export type IUserProfileFollower = {
  id: string;
  name: string;
  country: string;
  avatarUrl: string;
};

export type IUserProfileGallery = {
  id: string;
  title: string;
  imageUrl: string;
  postedAt: IDateValue;
};

export type IUserProfileFriend = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
};

export type IUserProfilePost = {
  id: string;
  media: string;
  message: string;
  createdAt: IDateValue;
  personLikes: { name: string; avatarUrl: string }[];
  comments: {
    id: string;
    message: string;
    createdAt: IDateValue;
    author: { id: string; name: string; avatarUrl: string };
  }[];
};

export type IUserCard = {
  id: string;
  name: string;
  role: string;
  coverUrl: string;
  avatarUrl: string;
  totalPosts: number;
  totalFollowers: number;
  totalFollowing: number;
};

export type IUserAccountBillingHistory = {
  id: string;
  price: number;
  invoiceNumber: string;
  createdAt: IDateValue;
};
