// ----------------------------------------------------------------------
// BNW OMS — Leave / holiday types, mirroring the backend's leave DTOs
// (Backend/src/common/mappers/leave.mapper.ts, Backend/src/leave/dto).

export type LeaveRequestStatus =
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export const LEAVE_STATUS_OPTIONS: LeaveRequestStatus[] = [
  'PENDING_MANAGER',
  'PENDING_HR',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

export interface LeaveTypeDto {
  id: number;
  name: string;
  annualQuota: number | null; // null = no limit
  isActive: boolean;
}

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
  startDate: string; // YYYY-MM-DD
  endDate: string;
  halfDay: boolean;
  days: number;
  reason: string;
  contactDuringLeave: string | null;
  status: LeaveRequestStatus;
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

export interface LeaveListMeta {
  total: number;
  page: number;
  limit: number;
}

export type CreateLeaveRequestDto = {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  reason: string;
  contactDuringLeave?: string;
};

export type LeaveDecisionDto = {
  approved: boolean;
  remarks?: string;
  signatureText: string;
};
