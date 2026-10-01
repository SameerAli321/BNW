import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  user: icon('ic-user'),
  dashboard: icon('ic-dashboard'),
  folder: icon('ic-folder'),
  mail: icon('ic-mail'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  job: icon('ic-job'),
  external: icon('ic-external'),
};

// ----------------------------------------------------------------------

/**
 * BNW OMS — Sprint 0/1 nav.
 *
 * Trimmed to this phase's real modules (Dashboard, Users) per the project guide §7/§11 and
 * docs/API_CONTRACT_SPRINT1.md. All the minimal-kit demo sections (Ecommerce, Product, Order,
 * Invoice, Blog, Job, Tour, File manager, Mail, Chat, Calendar, Kanban, and the "Misc" nav-demo
 * items) are out of scope for this project and are commented out below rather than deleted, so
 * they're easy to find if a later sprint needs the pattern they demonstrate. Their routes/pages
 * still exist in the codebase (untouched) — they're just not linked from the sidebar.
 *
 * `allowedRoles` uses the 6 BNW roles (see docs/API_CONTRACT_SPRINT1.md): EMPLOYEE, MANAGER,
 * HR, CEO, PAYROLL, ADMIN. Per the guide §4 permissions table, only HR and ADMIN manage users.
 */
export const navData: NavSectionProps['data'] = [
  {
    subheader: 'Overview',
    items: [{ title: 'Dashboard', path: paths.dashboard.root, icon: ICONS.dashboard }],
  },
  {
    subheader: 'Management',
    items: [
      {
        title: 'Users',
        path: paths.dashboard.user.list,
        icon: ICONS.user,
        allowedRoles: ['HR', 'ADMIN'],
      },
      {
        title: 'Staff Summary',
        path: paths.dashboard.staffSummary,
        icon: ICONS.folder,
        allowedRoles: ['HR', 'CEO', 'ADMIN'],
      },
      {
        // "My E-record" — every role's own profile + document upload, reached via a stable
        // redirect route (`paths.dashboard.myRecord`) that forwards to the logged-in user's own
        // `employees/:id/record` page. No `allowedRoles`: everyone has their own record. Replaces
        // the old "My E-record" button that lived on the Account page and the dashboard-home card.
        title: 'My E-record',
        path: paths.dashboard.myRecord,
        icon: ICONS.folder,
      },
      {
        // Sprint 3 — Letter engine (see docs/API_CONTRACT_SPRINT3.md). No `allowedRoles`: every
        // role can see this item, since an employee needs it to find/sign their own pending
        // letters — `GET /letters` is server-filtered to "my letters only" for non-HR/CEO/ADMIN
        // callers, so there's nothing to hide client-side. Inside the page, create/submit/sign
        // actions are gated per-role (and per-letter-status) individually.
        title: 'Letters',
        path: paths.dashboard.letters.root,
        icon: ICONS.mail,
      },
      {
        // One hub for every HR form (Complaint, Attendance Regularization, Onboarding) and letter
        // template (Appraisal, Intern employment). No `allowedRoles`: everyone uses the forms;
        // the letter cards inside only render for HR / CEO / ADMIN. The old "Letter Templates"
        // table is reached from here ("Manage letter templates").
        title: 'Requests & Forms',
        path: paths.dashboard.requestsForms,
        icon: ICONS.file,
      },
      {
        // Announcement board. No `allowedRoles`: everyone reads it (it's also on every dashboard);
        // the Post / Edit / Delete controls inside only render for CEO / ADMIN / HR.
        title: 'Announcements',
        path: paths.dashboard.announcements,
        icon: ICONS.mail,
      },
      {
        // Sprint 4 — Appraisals (see docs/API_CONTRACT_SPRINT4.md). No `allowedRoles`: every
        // role can see this item, same reasoning as "Letters" — an employee needs it to find/
        // request their own appraisals. The page itself has no client-side role gate either
        // (tabs for "My Team"/"Pending my review"/"All" only render for roles the contract
        // grants them to; `GET /appraisal-requests/mine` is always self-scoped by the backend).
        title: 'Appraisals',
        path: paths.dashboard.appraisals.root,
        icon: ICONS.job,
      },
      {
        // Daily activity log (see docs/API_CONTRACT_ACTIVITY_LOG.md). No `allowedRoles`: every
        // role logs their own work. Team/Managers/All Staff tabs inside the page only render for
        // MANAGER / CEO / ADMIN, and the backend scopes each endpoint by role.
        title: 'Daily Activity',
        path: paths.dashboard.activity,
        icon: ICONS.file,
      },
      {
        // Gap-fix — Audit Log (see docs/API_CONTRACT_GAPS_FIX.md Gap 2). CEO/ADMIN only, same
        // `allowedRoles` pattern as "Staff Summary".
        title: 'Audit Log',
        path: paths.dashboard.auditLog,
        icon: ICONS.lock,
        allowedRoles: ['CEO', 'ADMIN'],
      },
      {
        // Sprint 5 — Hiring (see docs/API_CONTRACT_SPRINT5.md). HR/ADMIN manage candidates
        // (bulk CV upload, shortlist/status, convert to employee) — same gating as "Users".
        title: 'Hiring',
        path: paths.dashboard.candidates.root,
        icon: ICONS.job,
        allowedRoles: ['HR', 'ADMIN'],
      },
      {
        // Sprint 5 — Joining pack. Every employee needs to see and acknowledge their own joining
        // pack (same reasoning as "My E-record"); HR/ADMIN additionally get manage controls
        // (add/edit item) inline on the same page. CEO has no joining pack of their own, so it's
        // hidden from their sidebar.
        title: 'Joining Pack',
        path: paths.dashboard.joiningPack,
        icon: ICONS.external,
        allowedRoles: ['HR', 'MANAGER', 'PAYROLL', 'ADMIN', 'EMPLOYEE'],
      },
    ],
  },

  /**
   * Demo-only sections from the minimal-kit template — not part of the BNW OMS scope for this
   * phase. Left commented out (not deleted) so the nav-item pattern is easy to reuse for later
   * sprints (E-record, Appraisals, Leave, etc. per the project guide §11 roadmap).
   */
  // {
  //   subheader: 'Overview',
  //   items: [
  //     { title: 'Ecommerce', path: paths.dashboard.general.ecommerce, icon: ICONS.ecommerce },
  //     { title: 'Analytics', path: paths.dashboard.general.analytics, icon: ICONS.analytics },
  //     { title: 'Banking', path: paths.dashboard.general.banking, icon: ICONS.banking },
  //     { title: 'Booking', path: paths.dashboard.general.booking, icon: ICONS.booking },
  //     { title: 'File', path: paths.dashboard.general.file, icon: ICONS.file },
  //     { title: 'Course', path: paths.dashboard.general.course, icon: ICONS.course },
  //   ],
  // },
  // {
  //   subheader: 'Management (demo)',
  //   items: [
  //     {
  //       title: 'User (demo)',
  //       path: paths.dashboard.user.root,
  //       icon: ICONS.user,
  //       children: [
  //         { title: 'Profile', path: paths.dashboard.user.root },
  //         { title: 'Cards', path: paths.dashboard.user.cards },
  //         { title: 'Account', path: paths.dashboard.user.account, deepMatch: true },
  //       ],
  //     },
  //     { title: 'Product', path: paths.dashboard.product.root, icon: ICONS.product },
  //     { title: 'Order', path: paths.dashboard.order.root, icon: ICONS.order },
  //     { title: 'Invoice', path: paths.dashboard.invoice.root, icon: ICONS.invoice },
  //     { title: 'Blog', path: paths.dashboard.post.root, icon: ICONS.blog },
  //     { title: 'Job', path: paths.dashboard.job.root, icon: ICONS.job },
  //     { title: 'Tour', path: paths.dashboard.tour.root, icon: ICONS.tour },
  //     { title: 'File manager', path: paths.dashboard.fileManager, icon: ICONS.folder },
  //     { title: 'Mail', path: paths.dashboard.mail, icon: ICONS.mail },
  //     { title: 'Chat', path: paths.dashboard.chat, icon: ICONS.chat },
  //     { title: 'Calendar', path: paths.dashboard.calendar, icon: ICONS.calendar },
  //     { title: 'Kanban', path: paths.dashboard.kanban, icon: ICONS.kanban },
  //   ],
  // },
];
