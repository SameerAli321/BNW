import type { SWRConfiguration } from 'swr';

import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — dashboard home data layer. Mirrors Backend/src/dashboard.

export type ChartDatum = { label: string; value: number };

/** One value per month; `months` are 'YYYY-MM', oldest first. */
export type MonthlySeries = { months: string[]; series: { name: string; data: number[] }[] };

export type OnLeaveTodayItem = {
  employeeId: number;
  employeeName: string;
  leaveTypeName: string;
  endDate: string;
};

export type PersonalDashboard = {
  lettersToSign: number;
  documentsOnFile: number;
  documentsRequested: number;
  openRequests: number;
  myRequestsByStatus: ChartDatum[];
  leaveDaysByMonth: MonthlySeries;
  activityHoursByDay: ChartDatum[]; // label = 'YYYY-MM-DD', last 14 days
  activityByCategory: ChartDatum[]; // last 30 days
};

export type TeamDashboard = {
  size: number;
  pendingLeave: number;
  pendingAttendance: number;
  onLeaveToday: OnLeaveTodayItem[];
};

export type CompanyDashboard = {
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
};

export type DashboardDto = {
  personal: PersonalDashboard;
  team: TeamDashboard | null; // only for line managers
  company: CompanyDashboard | null; // only for HR / ADMIN / CEO
};

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: false,
};

/** GET /dashboard — everything the dashboard home page plots, in one request. */
export function useGetDashboard() {
  const { data, isLoading, error } = useSWR<{ data: DashboardDto }>(
    endpoints.dashboard,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({ dashboard: data?.data, dashboardLoading: isLoading, dashboardError: error }),
    [data?.data, isLoading, error]
  );
}
