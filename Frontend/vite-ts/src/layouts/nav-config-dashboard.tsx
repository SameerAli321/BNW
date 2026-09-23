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
        title: 'Letter Templates',
        path: paths.dashboard.letterTemplates.root,
        icon: ICONS.file,
        allowedRoles: ['HR', 'CEO', 'ADMIN'],
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
