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
// Sprint 2 — E-record & Staff summary (see docs/API_CONTRACT_SPRINT2.md)
const StaffSummaryListPage = lazy(() => import('src/pages/dashboard/staff-summary/list'));
const EmployeeRecordPage = lazy(() => import('src/pages/dashboard/employees/record'));
// Sprint 3 — Letter engine (see docs/API_CONTRACT_SPRINT3.md)
const LetterListPage = lazy(() => import('src/pages/dashboard/letters/list'));
const LetterCreatePage = lazy(() => import('src/pages/dashboard/letters/new'));
const LetterDetailPage = lazy(() => import('src/pages/dashboard/letters/detail'));
const LetterTemplateListPage = lazy(() => import('src/pages/dashboard/letter-templates/list'));
const LetterTemplateCreatePage = lazy(() => import('src/pages/dashboard/letter-templates/new'));
const LetterTemplateEditPage = lazy(() => import('src/pages/dashboard/letter-templates/edit'));

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
            ],
          },
        ],
      },
      { path: 'staff-summary', element: <StaffSummaryListPage /> },
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
    ],
  },
];
