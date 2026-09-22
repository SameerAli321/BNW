import { User } from '../../entities/user.entity';

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
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maps a User entity to the API's UserDto shape (per API_CONTRACT_SPRINT1.md).
 * Never includes password_hash. manager/department relations are optional — include them
 * with `{ relations: ['manager', 'department'] }` on the query to populate the *Name fields.
 */
export function toUserDto(user: User): UserDto {
  return {
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
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
