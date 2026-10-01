import type { RouteObject } from 'react-router';

import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AccountLayout } from 'src/sections/account/account-layout';

import { AuthGuard } from 'src/auth/guard';

import { usePathname } from '../hooks';

// ----------------------------------------------------------------------
// BNW OMS: trimmed to this phase's real modules (Dashboard, Users, own-account settings) per
// the project guide §7/§11 and docs/API_CONTRACT_SPRINT1.md. The minimal-kit's demo routes
// (Ecommerce, Product, Order, Invoice, Blog, Job, Tour, File manager, Mail, Chat, Calendar,
// Kanban, and the misc test pages) are out of scope for this project — their page components
// still exist in the codebase untouched, they're just not routed/reachable here.

// Overview
const IndexPage = lazy(() => import('src/pages/dashboard'));
// User
const UserListPage = lazy(() => import('src/pages/dashboard/user/list'));
const UserCreatePage = lazy(() => import('src/pages/dashboard/user/new'));
const UserEditPage = lazy(() => import('src/pages/dashboard/user/edit'));
// Account (own profile / change password — needed for the mustChangePassword flow)
const AccountGeneralPage = lazy(() => import('src/pages/dashboard/user/account/general'));
const AccountChangePasswordPage = lazy(
  () => import('src/pages/dashboard/user/account/change-password')
);
// Gap-fix — Personal details (see docs/API_CONTRACT_GAPS_FIX.md Gap 1)
const AccountPersonalDetailsPage = lazy(
  () => import('src/pages/dashboard/user/account/personal-details')
);
const AuditLogListPage = lazy(() => import('src/pages/dashboard/audit-log/list'));
// Sprint 2 — E-record & Staff summary (see docs/API_CONTRACT_SPRINT2.md)
const StaffSummaryListPage = lazy(() => import('src/pages/dashboard/staff-summary/list'));
const EmployeeRecordPage = lazy(() => import('src/pages/dashboard/employees/record'));
const MyERecordPage = lazy(() => import('src/pages/dashboard/my-e-record'));
// Sprint 3 — Letter engine (see docs/API_CONTRACT_SPRINT3.md)
const LetterListPage = lazy(() => import('src/pages/dashboard/letters/list'));
const LetterCreatePage = lazy(() => import('src/pages/dashboard/letters/new'));
const LetterDetailPage = lazy(() => import('src/pages/dashboard/letters/detail'));
const LetterTemplateListPage = lazy(() => import('src/pages/dashboard/letter-templates/list'));
const LetterTemplateCreatePage = lazy(() => import('src/pages/dashboard/letter-templates/new'));
const LetterTemplateEditPage = lazy(() => import('src/pages/dashboard/letter-templates/edit'));
// Sprint 4 — Appraisals (see docs/API_CONTRACT_SPRINT4.md)
const AppraisalListPage = lazy(() => import('src/pages/dashboard/appraisals/list'));
const AppraisalDetailPage = lazy(() => import('src/pages/dashboard/appraisals/detail'));
// Sprint 5 — Hiring (see docs/API_CONTRACT_SPRINT5.md)
const CandidateListPage = lazy(() => import('src/pages/dashboard/candidates/list'));
const JoiningPackPage = lazy(() => import('src/pages/dashboard/joining-pack'));
// Daily activity log (see docs/API_CONTRACT_ACTIVITY_LOG.md)
const ActivityLogListPage = lazy(() => import('src/pages/dashboard/activity/list'));
// Requests & Forms hub (every HR form + the letter templates)
const RequestsFormsPage = lazy(() => import('src/pages/dashboard/requests-forms'));
// Complaint form (submitted by anyone to HR)
const ComplaintListPage = lazy(() => import('src/pages/dashboard/complaints/list'));
const ComplaintCreatePage = lazy(() => import('src/pages/dashboard/complaints/new'));
const ComplaintDetailPage = lazy(() => import('src/pages/dashboard/complaints/detail'));
// Attendance regularization form (employee -> HOD -> HR)
const AttendanceRegularizationListPage = lazy(
  () => import('src/pages/dashboard/attendance-regularizations/list')
);
const AttendanceRegularizationCreatePage = lazy(
  () => import('src/pages/dashboard/attendance-regularizations/new')
);
const AttendanceRegularizationDetailPage = lazy(
  () => import('src/pages/dashboard/attendance-regularizations/detail')
);
// Leave / holiday (employee -> manager -> HR)
const LeaveRequestListPage = lazy(() => import('src/pages/dashboard/leave-requests/list'));
const LeaveRequestCreatePage = lazy(() => import('src/pages/dashboard/leave-requests/new'));
const LeaveRequestDetailPage = lazy(() => import('src/pages/dashboard/leave-requests/detail'));
// Work orders (reimbursement / equipment: employee -> manager -> CEO over limit -> Payroll / HR)
const WorkOrderListPage = lazy(() => import('src/pages/dashboard/work-orders/list'));
const WorkOrderCreatePage = lazy(() => import('src/pages/dashboard/work-orders/new'));
const WorkOrderDetailPage = lazy(() => import('src/pages/dashboard/work-orders/detail'));
// Announcement board
const AnnouncementsPage = lazy(() => import('src/pages/dashboard/announcements'));
// Notifications (full list behind the header bell)
const NotificationsPage = lazy(() => import('src/pages/dashboard/notifications'));
// Employee onboarding form (fills the E-record; HR records it)
const OnboardingFormListPage = lazy(() => import('src/pages/dashboard/onboarding-forms/list'));
const OnboardingFormMinePage = lazy(() => import('src/pages/dashboard/onboarding-forms/mine'));
const OnboardingFormDetailPage = lazy(() => import('src/pages/dashboard/onboarding-forms/detail'));

// ----------------------------------------------------------------------

function SuspenseOutlet() {
  const pathname = usePathname();
  return (
    <Suspense key={pathname} fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}

const dashboardLayout = () => (
  <DashboardLayout>
    <SuspenseOutlet />
  </DashboardLayout>
);

const accountLayout = () => (
  <AccountLayout>
    <SuspenseOutlet />
  </AccountLayout>
);

export const dashboardRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    element: CONFIG.auth.skip ? dashboardLayout() : <AuthGuard>{dashboardLayout()}</AuthGuard>,
    children: [
      { index: true, element: <IndexPage /> },
      {
        path: 'user',
        children: [
          { index: true, element: <UserListPage /> },
          { path: 'list', element: <UserListPage /> },
          { path: 'new', element: <UserCreatePage /> },
          { path: ':id/edit', element: <UserEditPage /> },
          {
            path: 'account',
            element: accountLayout(),
            children: [
              { index: true, element: <AccountGeneralPage /> },
              { path: 'change-password', element: <AccountChangePasswordPage /> },
              { path: 'personal-details', element: <AccountPersonalDetailsPage /> },
            ],
          },
        ],
      },
      { path: 'staff-summary', element: <StaffSummaryListPage /> },
      { path: 'audit-log', element: <AuditLogListPage /> },
      { path: 'my-e-record', element: <MyERecordPage /> },
      {
        path: 'employees',
        children: [{ path: ':id/record', element: <EmployeeRecordPage /> }],
      },
      {
        path: 'letters',
        children: [
          { index: true, element: <LetterListPage /> },
          { path: 'new', element: <LetterCreatePage /> },
          { path: ':id', element: <LetterDetailPage /> },
        ],
      },
      {
        path: 'letter-templates',
        children: [
          { index: true, element: <LetterTemplateListPage /> },
          { path: 'new', element: <LetterTemplateCreatePage /> },
          { path: ':id/edit', element: <LetterTemplateEditPage /> },
        ],
      },
      {
        path: 'appraisals',
        children: [
          { index: true, element: <AppraisalListPage /> },
          { path: ':id', element: <AppraisalDetailPage /> },
        ],
      },
      { path: 'candidates', element: <CandidateListPage /> },
      { path: 'joining-pack', element: <JoiningPackPage /> },
      { path: 'activity', element: <ActivityLogListPage /> },
      { path: 'requests-forms', element: <RequestsFormsPage /> },
      {
        path: 'complaints',
        children: [
          { index: true, element: <ComplaintListPage /> },
          { path: 'new', element: <ComplaintCreatePage /> },
          { path: ':id', element: <ComplaintDetailPage /> },
        ],
      },
      {
        path: 'attendance-regularizations',
        children: [
          { index: true, element: <AttendanceRegularizationListPage /> },
          { path: 'new', element: <AttendanceRegularizationCreatePage /> },
          { path: ':id', element: <AttendanceRegularizationDetailPage /> },
        ],
      },
      {
        path: 'leave-requests',
        children: [
          { index: true, element: <LeaveRequestListPage /> },
          { path: 'new', element: <LeaveRequestCreatePage /> },
          { path: ':id', element: <LeaveRequestDetailPage /> },
        ],
      },
      {
        path: 'work-orders',
        children: [
          { index: true, element: <WorkOrderListPage /> },
          { path: 'new', element: <WorkOrderCreatePage /> },
          { path: ':id', element: <WorkOrderDetailPage /> },
        ],
      },
      { path: 'announcements', element: <AnnouncementsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      {
        path: 'onboarding-forms',
        children: [
          { index: true, element: <OnboardingFormListPage /> },
          { path: 'mine', element: <OnboardingFormMinePage /> },
          { path: ':id', element: <OnboardingFormDetailPage /> },
        ],
      },
    ],
  },
];
