// ----------------------------------------------------------------------
// BNW OMS — Attendance regularization form types, mirroring the backend's
// AttendanceRegularizationDto / request DTOs
// (Backend/src/common/mappers/attendance-regularization.mapper.ts,
// Backend/src/attendance-regularizations/dto).

export type AttendanceRegularizationStatus =
  | 'PENDING_HOD'
  | 'HOD_NOT_RECOMMENDED'
  | 'PENDING_HR'
  | 'TAKEN_ON_RECORD'
  | 'NOT_IN_ORDER';

export const ATTENDANCE_REGULARIZATION_STATUS_OPTIONS: AttendanceRegularizationStatus[] = [
  'PENDING_HOD',
  'HOD_NOT_RECOMMENDED',
  'PENDING_HR',
  'TAKEN_ON_RECORD',
  'NOT_IN_ORDER',
];

export type AttendanceHrDecision = 'TAKEN_ON_RECORD' | 'NOT_IN_ORDER';

export interface AttendanceRegularizationDto {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  employeeDesignation: string | null;
  employeeDepartment: string | null;
  attendanceDate: string; // YYYY-MM-DD
  timeArrival: string | null; // HH:MM
  timeDeparture: string | null; // HH:MM
  reason: string;
  status: AttendanceRegularizationStatus;
  hodId: number | null;
  hodName: string | null;
  hodRecommended: boolean | null;
  hodRemarks: string | null;
  hodSignatureText: string | null;
  hodSignedAt: string | null;
  hrDecision: AttendanceHrDecision | null;
  hrRemarks: string | null;
  hrUserName: string | null;
  hrSignatureText: string | null;
  hrSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRegularizationListMeta {
  total: number;
  page: number;
  limit: number;
}

export type CreateAttendanceRegularizationDto = {
  attendanceDate: string;
  timeArrival?: string;
  timeDeparture?: string;
  reason: string;
};

export type HodRecommendationDto = {
  recommended: boolean;
  remarks?: string;
  signatureText: string;
};

export type AttendanceHrDecisionDto = {
  decision: AttendanceHrDecision;
  remarks?: string;
  signatureText: string;
};
