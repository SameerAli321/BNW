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

export type UserAccountStatus = 'ONBOARDING' | 'ACTIVE' | 'INACTIVE';

export const USER_ACCOUNT_STATUS_OPTIONS: { value: UserAccountStatus; label: string }[] = [
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

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
  joinDate: string | null; // ISO date
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
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
