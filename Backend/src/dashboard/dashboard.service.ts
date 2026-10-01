import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/enums/role.enum';

/** Roles that see the company-wide section of the dashboard. */
export const COMPANY_DASHBOARD_ROLES: string[] = [RoleName.HR, RoleName.ADMIN, RoleName.CEO];

export interface ChartDatum {
  label: string;
  value: number;
}

/** One point per month ('YYYY-MM'), oldest first — the frontend turns it into "Jan", "Feb", … */
export interface MonthlySeries {
  months: string[];
  series: { name: string; data: number[] }[];
}

export interface OnLeaveTodayItem {
  employeeId: number;
  employeeName: string;
  leaveTypeName: string;
  endDate: string;
}

export interface PersonalDashboard {
  lettersToSign: number;
  documentsOnFile: number;
  documentsRequested: number;
  openRequests: number;
  myRequestsByStatus: ChartDatum[];
  leaveDaysByMonth: MonthlySeries;
  activityHoursByDay: ChartDatum[];
  activityByCategory: ChartDatum[];
}

export interface TeamDashboard {
  size: number;
  pendingLeave: number;
  pendingAttendance: number;
  onLeaveToday: OnLeaveTodayItem[];
}

export interface CompanyDashboard {
  headcount: { total: number; active: number; inactive: number };
  byDepartment: ChartDatum[];
  byRole: ChartDatum[];
  joinersByMonth: MonthlySeries;
  requestsByMonth: MonthlySeries;
  leaveDaysByType: ChartDatum[];
  onLeaveToday: OnLeaveTodayItem[];
  pending: {
    leaveHr: number;
    complaintsOpen: number;
    attendanceHr: number;
    onboardingToRecord: number;
    lettersPendingCeo: number;
    appraisalsPendingCeo: number;
  };
  lettersByStatus: ChartDatum[];
  complaintsByStatus: ChartDatum[];
  appraisalsByStatus: ChartDatum[];
  candidatesByStatus: ChartDatum[];
}

export interface DashboardDto {
  personal: PersonalDashboard;
  team: TeamDashboard | null;
  company: CompanyDashboard | null;
}

type MonthRow = { month: string; value: string };

const toNumber = (value: unknown): number => Number(value ?? 0) || 0;

const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The last `count` months as 'YYYY-MM', oldest first, ending with the current month. */
function lastMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

/** Spreads `{ month, value }` rows over the month axis, filling gaps with 0. */
function monthly(months: string[], rows: MonthRow[]): number[] {
  const byMonth = new Map(rows.map((row) => [row.month, toNumber(row.value)]));
  return months.map((month) => byMonth.get(month) ?? 0);
}

const sumOf = (data: ChartDatum[], statuses: string[]): number =>
  data.filter((d) => statuses.includes(d.label)).reduce((total, d) => total + d.value, 0);

/**
 * Numbers and chart series for the dashboard home page, in one round trip. Everyone gets their
 * own "personal" section; line managers also get "team"; HR / ADMIN / CEO also get "company".
 * Plain aggregate SQL over the existing tables — nothing new is stored.
 */
@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async summary(caller: JwtUserPayload): Promise<DashboardDto> {
    const [personal, team, company] = await Promise.all([
      this.personal(caller.sub),
      this.team(caller.sub),
      COMPANY_DASHBOARD_ROLES.includes(caller.role) ? this.company() : Promise.resolve(null),
    ]);
    return { personal, team, company };
  }

  private rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.dataSource.query(sql, params);
  }

  private async count(sql: string, params: unknown[] = []): Promise<number> {
    const [row] = await this.rows<{ count: string }>(sql, params);
    return toNumber(row?.count);
  }

  private async grouped(sql: string, params: unknown[] = []): Promise<ChartDatum[]> {
    const rows = await this.rows<{ label: string; value: string }>(sql, params);
    return rows.map((row) => ({ label: row.label, value: toNumber(row.value) }));
  }

  // --------------------------------------------------------------------------------------------

  private async personal(userId: number): Promise<PersonalDashboard> {
    const months = lastMonths(12);
    const [
      lettersToSign,
      documentsOnFile,
      documentsRequested,
      leaveStatus,
      complaintStatus,
      attendanceStatus,
      leaveDays,
      activityHours,
      activityByCategory,
    ] = await Promise.all([
      this.count(
        `SELECT COUNT(*) AS count FROM letters WHERE subject_user_id = $1 AND status = 'SENT_TO_EMPLOYEE'`,
        [userId],
      ),
      this.count(`SELECT COUNT(*) AS count FROM employee_documents WHERE user_id = $1`, [userId]),
      this.count(
        `SELECT COUNT(*) AS count FROM document_requests WHERE user_id = $1 AND status = 'REQUESTED'`,
        [userId],
      ),
      this.grouped(
        `SELECT status AS label, COUNT(*) AS value FROM leave_requests WHERE employee_id = $1 GROUP BY status`,
        [userId],
      ),
      this.grouped(
        `SELECT status AS label, COUNT(*) AS value FROM complaints WHERE complainant_id = $1 GROUP BY status`,
        [userId],
      ),
      this.grouped(
        `SELECT status AS label, COUNT(*) AS value FROM attendance_regularizations
          WHERE employee_id = $1 GROUP BY status`,
        [userId],
      ),
      this.rows<MonthRow>(
        `SELECT to_char(start_date, 'YYYY-MM') AS month, SUM(days) AS value
           FROM leave_requests
          WHERE employee_id = $1 AND status = 'APPROVED' AND start_date >= $2::date
          GROUP BY 1`,
        [userId, `${months[0]}-01`],
      ),
      this.rows<{ day: string; value: string }>(
        `SELECT to_char(activity_date, 'YYYY-MM-DD') AS day, SUM(hours) AS value
           FROM daily_activity_logs
          WHERE user_id = $1 AND activity_date >= CURRENT_DATE - 13
          GROUP BY 1`,
        [userId],
      ),
      this.grouped(
        `SELECT category AS label, SUM(hours) AS value
           FROM daily_activity_logs
          WHERE user_id = $1 AND activity_date >= CURRENT_DATE - 29
          GROUP BY category ORDER BY value DESC`,
        [userId],
      ),
    ]);

    // "Open" = still waiting on someone, across all of the person's forms.
    const openRequests =
      sumOf(leaveStatus, ['PENDING_MANAGER', 'PENDING_HR']) +
      sumOf(complaintStatus, ['SUBMITTED', 'IN_PROGRESS']) +
      sumOf(attendanceStatus, ['PENDING_HOD', 'PENDING_HR']);
    const done =
      sumOf(leaveStatus, ['APPROVED']) +
      sumOf(complaintStatus, ['RESOLVED']) +
      sumOf(attendanceStatus, ['TAKEN_ON_RECORD']);
    const notApproved =
      sumOf(leaveStatus, ['REJECTED']) +
      sumOf(attendanceStatus, ['HOD_NOT_RECOMMENDED', 'NOT_IN_ORDER']);

    // Last 14 days, one bar per day (0 on days with nothing logged).
    const hoursByDay = new Map(activityHours.map((row) => [row.day, toNumber(row.value)]));
    const activityHoursByDay: ChartDatum[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = isoDay(d);
      activityHoursByDay.push({ label: key, value: hoursByDay.get(key) ?? 0 });
    }

    return {
      lettersToSign,
      documentsOnFile,
      documentsRequested,
      openRequests,
      myRequestsByStatus: [
        { label: 'In progress', value: openRequests },
        { label: 'Approved / done', value: done },
        { label: 'Not approved', value: notApproved },
      ],
      leaveDaysByMonth: {
        months,
        series: [{ name: 'Leave days', data: monthly(months, leaveDays) }],
      },
      activityHoursByDay,
      activityByCategory,
    };
  }

  // --------------------------------------------------------------------------------------------

  private onLeaveTodaySql(extraWhere: string): string {
    return `SELECT u.id AS "employeeId", u.first_name || ' ' || u.last_name AS "employeeName",
                   t.name AS "leaveTypeName", to_char(r.end_date, 'YYYY-MM-DD') AS "endDate"
              FROM leave_requests r
              JOIN users u ON u.id = r.employee_id AND u.deleted_at IS NULL
              JOIN leave_types t ON t.id = r.leave_type_id
             WHERE r.status = 'APPROVED' AND CURRENT_DATE BETWEEN r.start_date AND r.end_date
                   ${extraWhere}
             ORDER BY r.end_date, u.first_name`;
  }

  private async team(userId: number): Promise<TeamDashboard | null> {
    const size = await this.count(
      `SELECT COUNT(*) AS count FROM users
        WHERE manager_id = $1 AND deleted_at IS NULL AND status <> 'INACTIVE'`,
      [userId],
    );
    if (!size) return null;
    const [pendingLeave, pendingAttendance, onLeaveToday] = await Promise.all([
      this.count(
        `SELECT COUNT(*) AS count FROM leave_requests WHERE manager_id = $1 AND status = 'PENDING_MANAGER'`,
        [userId],
      ),
      this.count(
        `SELECT COUNT(*) AS count FROM attendance_regularizations WHERE hod_id = $1 AND status = 'PENDING_HOD'`,
        [userId],
      ),
      this.rows<OnLeaveTodayItem>(this.onLeaveTodaySql('AND u.manager_id = $1'), [userId]),
    ]);
    return { size, pendingLeave, pendingAttendance, onLeaveToday };
  }

  // --------------------------------------------------------------------------------------------

  private async company(): Promise<CompanyDashboard> {
    const months = lastMonths(12);
    const recent = months.slice(-6);
    const perMonth = (table: string) =>
      this.rows<MonthRow>(
        `SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*) AS value
           FROM ${table} WHERE created_at >= $1::date GROUP BY 1`,
        [`${recent[0]}-01`],
      );

    const [
      headcountRows,
      byDepartment,
      byRole,
      joiners,
      leaveMonthly,
      complaintMonthly,
      attendanceMonthly,
      leaveDaysByType,
      onLeaveToday,
      pendingRows,
      lettersByStatus,
      complaintsByStatus,
      appraisalsByStatus,
      candidatesByStatus,
    ] = await Promise.all([
      this.grouped(
        `SELECT status AS label, COUNT(*) AS value FROM users WHERE deleted_at IS NULL GROUP BY status`,
      ),
      this.grouped(
        `SELECT COALESCE(d.name, 'No department') AS label, COUNT(*) AS value
           FROM users u LEFT JOIN departments d ON d.id = u.department_id
          WHERE u.deleted_at IS NULL AND u.status <> 'INACTIVE'
          GROUP BY 1 ORDER BY value DESC, label`,
      ),
      this.grouped(
        `SELECT role AS label, COUNT(*) AS value FROM users
          WHERE deleted_at IS NULL AND status <> 'INACTIVE' GROUP BY role ORDER BY value DESC`,
      ),
      this.rows<MonthRow>(
        `SELECT to_char(join_date, 'YYYY-MM') AS month, COUNT(*) AS value
           FROM users WHERE deleted_at IS NULL AND join_date >= $1::date GROUP BY 1`,
        [`${months[0]}-01`],
      ),
      perMonth('leave_requests'),
      perMonth('complaints'),
      perMonth('attendance_regularizations'),
      this.grouped(
        `SELECT t.name AS label, COALESCE(SUM(r.days), 0) AS value
           FROM leave_types t
           LEFT JOIN leave_requests r ON r.leave_type_id = t.id AND r.status = 'APPROVED'
                AND EXTRACT(YEAR FROM r.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          WHERE t.is_active
          GROUP BY t.id, t.name, t.sort_order ORDER BY t.sort_order, t.id`,
      ),
      this.rows<OnLeaveTodayItem>(this.onLeaveTodaySql('')),
      this.rows<Record<string, string>>(
        `SELECT
           (SELECT COUNT(*) FROM leave_requests WHERE status = 'PENDING_HR') AS "leaveHr",
           (SELECT COUNT(*) FROM complaints WHERE status IN ('SUBMITTED', 'IN_PROGRESS')) AS "complaintsOpen",
           (SELECT COUNT(*) FROM attendance_regularizations WHERE status = 'PENDING_HR') AS "attendanceHr",
           (SELECT COUNT(*) FROM onboarding_forms WHERE status = 'SUBMITTED') AS "onboardingToRecord",
           (SELECT COUNT(*) FROM letters WHERE status = 'PENDING_CEO') AS "lettersPendingCeo",
           (SELECT COUNT(*) FROM appraisal_requests WHERE status = 'PENDING_CEO') AS "appraisalsPendingCeo"`,
      ),
      this.grouped(`SELECT status AS label, COUNT(*) AS value FROM letters GROUP BY status`),
      this.grouped(`SELECT status AS label, COUNT(*) AS value FROM complaints GROUP BY status`),
      this.grouped(
        `SELECT status AS label, COUNT(*) AS value FROM appraisal_requests GROUP BY status`,
      ),
      this.grouped(`SELECT status AS label, COUNT(*) AS value FROM candidates GROUP BY status`),
    ]);

    const statusCount = (status: string) =>
      headcountRows.find((d) => d.label === status)?.value ?? 0;
    const pending = pendingRows[0] ?? {};

    return {
      headcount: {
        total: headcountRows.reduce((total, d) => total + d.value, 0),
        active: statusCount('ACTIVE'),
        inactive: statusCount('INACTIVE'),
      },
      byDepartment,
      byRole,
      joinersByMonth: { months, series: [{ name: 'New joiners', data: monthly(months, joiners) }] },
      requestsByMonth: {
        months: recent,
        series: [
          { name: 'Leave', data: monthly(recent, leaveMonthly) },
          { name: 'Complaints', data: monthly(recent, complaintMonthly) },
          { name: 'Attendance', data: monthly(recent, attendanceMonthly) },
        ],
      },
      leaveDaysByType,
      onLeaveToday,
      pending: {
        leaveHr: toNumber(pending.leaveHr),
        complaintsOpen: toNumber(pending.complaintsOpen),
        attendanceHr: toNumber(pending.attendanceHr),
        onboardingToRecord: toNumber(pending.onboardingToRecord),
        lettersPendingCeo: toNumber(pending.lettersPendingCeo),
        appraisalsPendingCeo: toNumber(pending.appraisalsPendingCeo),
      },
      lettersByStatus,
      complaintsByStatus,
      appraisalsByStatus,
      candidatesByStatus,
    };
  }
}
