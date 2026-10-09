import { AttendanceRegularization } from '../../entities/attendance-regularization.entity';
import { User } from '../../entities/user.entity';

export interface AttendanceRegularizationDto {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  employeeDesignation: string | null;
  employeeDepartment: string | null;
  attendanceDate: string;
  timeArrival: string | null;
  timeDeparture: string | null;
  reason: string;
  status: string;
  hodId: number | null;
  hodName: string | null;
  hodRecommended: boolean | null;
  hodRemarks: string | null;
  hodSignatureText: string | null;
  hodSignedAt: string | null;
  hrDecision: string | null;
  hrRemarks: string | null;
  hrUserName: string | null;
  hrSignatureText: string | null;
  hrSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const fullName = (user: User | null | undefined) =>
  user ? `${user.firstName} ${user.lastName}` : null;

/** Requires `employee`, `employee.department`, `hod` and `hrUser` to be loaded. */
export function toAttendanceRegularizationDto(
  row: AttendanceRegularization,
): AttendanceRegularizationDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: fullName(row.employee) ?? '',
    employeeCode: row.employee?.employeeCode ?? null,
    employeeDesignation: row.employee?.designation ?? null,
    employeeDepartment: row.employee?.department?.name ?? null,
    attendanceDate: row.attendanceDate,
    timeArrival: row.timeArrival,
    timeDeparture: row.timeDeparture,
    reason: row.reason,
    status: row.status,
    hodId: row.hodId,
    hodName: fullName(row.hod),
    hodRecommended: row.hodRecommended,
    hodRemarks: row.hodRemarks,
    hodSignatureText: row.hodSignatureText,
    hodSignedAt: row.hodSignedAt ? row.hodSignedAt.toISOString() : null,
    hrDecision: row.hrDecision,
    hrRemarks: row.hrRemarks,
    hrUserName: fullName(row.hrUser),
    hrSignatureText: row.hrSignatureText,
    hrSignedAt: row.hrSignedAt ? row.hrSignedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
