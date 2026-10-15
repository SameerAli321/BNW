import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoleName } from '../common/enums/role.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { dateToPkt } from '../bookings/booking-time';
import { QueryTeamStatusDto, TodayStatus } from './dto/team-status.dto';

/** See everyone; Team Leads (MANAGER) see their direct reports only. */
export const ALL_STAFF_ROLES: string[] = [RoleName.CEO, RoleName.HR, RoleName.ADMIN];

export interface TeamStatusRowDto {
  id: number;
  name: string;
  employeeCode: string | null;
  email: string;
  designation: string | null;
  role: string;
  department: string | null;
  manager: string | null;
  accountStatus: string;
  joinDate: string | null;
  today: { status: TodayStatus; detail: string | null };
  leave: {
    /** Approved days this year (all leave types). */
    taken: number;
    /** Days in requests still waiting for approval this year. */
    pendingDays: number;
    /** Left this year across leave types that have a quota (unpaid leave has none). */
    remaining: number;
    next: { startDate: string; endDate: string; type: string } | null;
  };
  pending: {
    leave: number;
    attendance: number;
    workOrders: number;
    appraisals: number;
    lettersToSign: number;
    total: number;
  };
}

export interface TeamStatusSummaryDto {
  total: number;
  available: number;
  onLeave: number;
  inMeeting: number;
  inactive: number;
  withPending: number;
}

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  employee_code: string | null;
  email: string;
  designation: string | null;
  role: string;
  status: string;
  join_date: string | null;
  department: string | null;
  manager: string | null;
};

const APPROVED_LIKE = `('APPROVED', 'CANCELLATION_REQUESTED')`;
const LEAVE_PENDING = `('PENDING_MANAGER', 'PENDING_HR')`;

/**
 * The "Team status" table at the end of the dashboard: for each person the caller may see, where
 * they are today (on leave / in a meeting / available / inactive), their leave this year, and the
 * requests and forms they still have in progress. Complaints are left out on purpose — they can be
 * about the person's own manager. Times are Pakistan time.
 */
@Injectable()
export class TeamStatusService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(query: QueryTeamStatusDto, caller: JwtUserPayload) {
    const users = await this.scopedUsers(query, caller);
    const rows = await this.buildRows(users);

    const summary: TeamStatusSummaryDto = {
      total: rows.length,
      available: rows.filter((r) => r.today.status === 'AVAILABLE').length,
      onLeave: rows.filter((r) => r.today.status === 'ON_LEAVE').length,
      inMeeting: rows.filter((r) => r.today.status === 'IN_MEETING').length,
      inactive: rows.filter((r) => r.today.status === 'INACTIVE').length,
      withPending: rows.filter((r) => r.pending.total > 0).length,
    };

    const filtered = rows.filter(
      (r) =>
        (!query.status || r.today.status === query.status) &&
        (!query.hasPending || r.pending.total > 0),
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      meta: { total: filtered.length, page, limit },
      summary,
      scope: ALL_STAFF_ROLES.includes(caller.role) ? 'all' : 'team',
    };
  }

  /** Everyone (CEO / HR / Admin) or the caller's direct reports (Team Leads), with filters. */
  private async scopedUsers(query: QueryTeamStatusDto, caller: JwtUserPayload) {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const where = ['u.deleted_at IS NULL'];
    if (!ALL_STAFF_ROLES.includes(caller.role)) where.push(`u.manager_id = ${param(caller.sub)}`);
    if (query.departmentId) where.push(`u.department_id = ${param(query.departmentId)}`);
    if (query.search) {
      const term = param(`%${query.search.replace(/[\\%_]/g, '\\$&')}%`);
      where.push(`((u.first_name || ' ' || u.last_name) ILIKE ${term} OR u.email ILIKE ${term}
        OR u.employee_code ILIKE ${term} OR u.designation ILIKE ${term})`);
    }
    return (await this.dataSource.query(
      `SELECT u.id, u.first_name, u.last_name, u.employee_code, u.email, u.designation,
              u.role::text AS role, u.status::text AS status, u.join_date::text AS join_date,
              d.name AS department,
              CASE WHEN m.id IS NULL THEN NULL ELSE m.first_name || ' ' || m.last_name END AS manager
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users m ON m.id = u.manager_id
       WHERE ${where.join(' AND ')}
       ORDER BY u.first_name, u.last_name, u.id`,
      params,
    )) as UserRow[];
  }

  private async buildRows(users: UserRow[]): Promise<TeamStatusRowDto[]> {
    if (!users.length) return [];
    const ids = users.map((u) => u.id);
    const today = dateToPkt(new Date()).date;
    const year = Number(today.slice(0, 4));
    const q = <T>(sql: string, params: unknown[]) =>
      this.dataSource.query(sql, params) as Promise<T[]>;

    const [onLeave, nextLeave, leaveTotals, quotas, inMeeting, pending] = await Promise.all([
      q<{ employee_id: number; type: string; end_date: string }>(
        `SELECT DISTINCT ON (lr.employee_id) lr.employee_id, lt.name AS type, lr.end_date::text AS end_date
         FROM leave_requests lr JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE lr.employee_id = ANY($1) AND lr.status IN ${APPROVED_LIKE}
           AND lr.start_date <= $2 AND lr.end_date >= $2
         ORDER BY lr.employee_id, lr.end_date DESC`,
        [ids, today],
      ),
      q<{ employee_id: number; type: string; start_date: string; end_date: string }>(
        `SELECT DISTINCT ON (lr.employee_id) lr.employee_id, lt.name AS type,
                lr.start_date::text AS start_date, lr.end_date::text AS end_date
         FROM leave_requests lr JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE lr.employee_id = ANY($1) AND lr.status IN ${APPROVED_LIKE} AND lr.start_date > $2
         ORDER BY lr.employee_id, lr.start_date`,
        [ids, today],
      ),
      q<{ employee_id: number; leave_type_id: number; used: string; pending: string }>(
        `SELECT employee_id, leave_type_id,
                COALESCE(SUM(CASE WHEN status IN ${APPROVED_LIKE} THEN days ELSE 0 END), 0) AS used,
                COALESCE(SUM(CASE WHEN status IN ${LEAVE_PENDING} THEN days ELSE 0 END), 0) AS pending
         FROM leave_requests
         WHERE employee_id = ANY($1) AND EXTRACT(YEAR FROM start_date) = $2
         GROUP BY employee_id, leave_type_id`,
        [ids, year],
      ),
      q<{ id: number; annual_quota: string }>(
        `SELECT id, annual_quota FROM leave_types WHERE is_active AND annual_quota IS NOT NULL`,
        [],
      ),
      q<{ user_id: number; end_at: Date }>(
        `SELECT x.user_id, MAX(b.end_at) AS end_at FROM bookings b
         JOIN LATERAL (
           SELECT b.organizer_id AS user_id
           UNION SELECT bp.user_id FROM booking_participants bp WHERE bp.booking_id = b.id
         ) x ON true
         WHERE b.type = 'MEETING' AND b.status = 'CONFIRMED'
           AND b.start_at <= now() AND b.end_at > now() AND x.user_id = ANY($1)
         GROUP BY x.user_id`,
        [ids],
      ),
      q<{ kind: string; user_id: number; n: number }>(
        `SELECT 'leave' AS kind, employee_id AS user_id, count(*)::int AS n FROM leave_requests
           WHERE employee_id = ANY($1)
             AND status IN ('PENDING_MANAGER', 'PENDING_HR', 'CANCELLATION_REQUESTED')
           GROUP BY employee_id
         UNION ALL
         SELECT 'attendance', employee_id, count(*)::int FROM attendance_regularizations
           WHERE employee_id = ANY($1) AND status IN ('PENDING_HOD', 'PENDING_HR')
           GROUP BY employee_id
         UNION ALL
         SELECT 'workOrders', employee_id, count(*)::int FROM work_orders
           WHERE employee_id = ANY($1)
             AND status IN ('PENDING_MANAGER', 'PENDING_CEO', 'PENDING_PROCESSING')
           GROUP BY employee_id
         UNION ALL
         SELECT 'appraisals', employee_id, count(*)::int FROM appraisal_requests
           WHERE employee_id = ANY($1) AND status IN ('PENDING_MANAGER', 'PENDING_CEO')
           GROUP BY employee_id
         UNION ALL
         SELECT 'lettersToSign', subject_user_id, count(*)::int FROM letters
           WHERE subject_user_id = ANY($1) AND status = 'SENT_TO_EMPLOYEE'
           GROUP BY subject_user_id`,
        [ids],
      ),
    ]);

    const quotaById = new Map(quotas.map((t) => [t.id, Number(t.annual_quota)]));
    const fmtDay = (iso: string) =>
      new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    const fmtTime = (value: Date) =>
      value.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Karachi',
      });

    return users.map((u) => {
      const leaveToday = onLeave.find((r) => r.employee_id === u.id);
      const meeting = inMeeting.find((r) => r.user_id === u.id);
      let status: TodayStatus = 'AVAILABLE';
      let detail: string | null = null;
      if (u.status !== 'ACTIVE') {
        status = 'INACTIVE';
        detail = 'Account inactive';
      } else if (leaveToday) {
        status = 'ON_LEAVE';
        detail = `${leaveToday.type} until ${fmtDay(leaveToday.end_date)}`;
      } else if (meeting) {
        status = 'IN_MEETING';
        detail = `Until ${fmtTime(new Date(meeting.end_at))} PKT`;
      }

      const totals = leaveTotals.filter((r) => r.employee_id === u.id);
      const taken = totals.reduce((sum, r) => sum + Number(r.used), 0);
      const pendingDays = totals.reduce((sum, r) => sum + Number(r.pending), 0);
      let remaining = 0;
      for (const [typeId, quota] of quotaById) {
        const row = totals.find((r) => r.leave_type_id === typeId);
        remaining += Math.max(quota - Number(row?.used ?? 0) - Number(row?.pending ?? 0), 0);
      }
      const next = nextLeave.find((r) => r.employee_id === u.id);

      const count = (kind: string) =>
        pending.find((r) => r.user_id === u.id && r.kind === kind)?.n ?? 0;
      const counts = {
        leave: count('leave'),
        attendance: count('attendance'),
        workOrders: count('workOrders'),
        appraisals: count('appraisals'),
        lettersToSign: count('lettersToSign'),
      };

      return {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        employeeCode: u.employee_code,
        email: u.email,
        designation: u.designation,
        role: u.role,
        department: u.department,
        manager: u.manager,
        accountStatus: u.status,
        joinDate: u.join_date,
        today: { status, detail },
        leave: {
          taken,
          pendingDays,
          remaining,
          next: next
            ? { startDate: next.start_date, endDate: next.end_date, type: next.type }
            : null,
        },
        pending: { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) },
      };
    });
  }
}
