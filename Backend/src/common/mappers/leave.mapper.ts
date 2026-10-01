import { LeaveRequest } from '../../entities/leave-request.entity';
import { LeaveType } from '../../entities/leave-type.entity';
import { User } from '../../entities/user.entity';

export interface LeaveTypeDto {
  id: number;
  name: string;
  annualQuota: number | null;
  isActive: boolean;
}

export function toLeaveTypeDto(type: LeaveType): LeaveTypeDto {
  return {
    id: type.id,
    name: type.name,
    annualQuota: type.annualQuota,
    isActive: type.isActive,
  };
}

/** One row of an employee's yearly balance. `remaining` is null for unlimited types. */
export interface LeaveBalanceDto {
  leaveTypeId: number;
  leaveTypeName: string;
  annualQuota: number | null;
  used: number;
  pending: number;
  remaining: number | null;
}

export interface LeaveRequestDto {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  employeeDesignation: string | null;
  employeeDepartment: string | null;
  leaveTypeId: number;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  days: number;
  reason: string;
  contactDuringLeave: string | null;
  status: string;
  managerId: number | null;
  managerName: string | null;
  managerApproved: boolean | null;
  managerRemarks: string | null;
  managerSignatureText: string | null;
  managerSignedAt: string | null;
  hrApproved: boolean | null;
  hrRemarks: string | null;
  hrUserName: string | null;
  hrSignatureText: string | null;
  hrSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const fullName = (user: User | null | undefined) =>
  user ? `${user.firstName} ${user.lastName}` : null;

/** Requires `employee`, `employee.department`, `leaveType`, `manager` and `hrUser` loaded. */
export function toLeaveRequestDto(row: LeaveRequest): LeaveRequestDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: fullName(row.employee) ?? '',
    employeeCode: row.employee?.employeeCode ?? null,
    employeeDesignation: row.employee?.designation ?? null,
    employeeDepartment: row.employee?.department?.name ?? null,
    leaveTypeId: row.leaveTypeId,
    leaveTypeName: row.leaveType?.name ?? '',
    startDate: row.startDate,
    endDate: row.endDate,
    halfDay: row.halfDay,
    days: row.days,
    reason: row.reason,
    contactDuringLeave: row.contactDuringLeave,
    status: row.status,
    managerId: row.managerId,
    managerName: fullName(row.manager),
    managerApproved: row.managerApproved,
    managerRemarks: row.managerRemarks,
    managerSignatureText: row.managerSignatureText,
    managerSignedAt: row.managerSignedAt ? row.managerSignedAt.toISOString() : null,
    hrApproved: row.hrApproved,
    hrRemarks: row.hrRemarks,
    hrUserName: fullName(row.hrUser),
    hrSignatureText: row.hrSignatureText,
    hrSignedAt: row.hrSignedAt ? row.hrSignedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
