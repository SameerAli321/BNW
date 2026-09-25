import type { DashboardContentProps } from 'src/layouts/dashboard';

import { removeLastSlash } from 'minimal-shared/utils';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

// BNW OMS: trimmed to routes that still exist (see routes/sections/dashboard.tsx) — Billing,
// Notifications and Social links aren't part of this project's scope.
const NAV_ITEMS = [
  {
    label: 'General',
    icon: <Iconify width={24} icon="solar:user-id-bold" />,
    href: paths.dashboard.user.account,
  },
  {
    label: 'Security',
    icon: <Iconify width={24} icon="ic:round-vpn-key" />,
    href: `${paths.dashboard.user.account}/change-password`,
  },
  // Gap-fix — Personal details (see docs/API_CONTRACT_GAPS_FIX.md Gap 1).
  {
    label: 'Personal details',
    icon: <Iconify width={24} icon="solar:file-text-bold" />,
    href: paths.dashboard.user.accountPersonalDetails,
  },
];

// ----------------------------------------------------------------------

export function AccountLayout({ children, ...other }: DashboardContentProps) {
  const pathname = usePathname();
  const { user } = useAuthContext();

  // Sprint 2: "My E-record" — reachable from a user's own account area (see
  // docs/API_CONTRACT_SPRINT2.md, U5). Not a tab under this layout's <Tabs> (it's a separate
  // route, not one of AccountLayout's own pages), so it's a plain link alongside the tabs rather
  // than a NAV_ITEMS entry.
  const myRecordHref = user?.id ? paths.dashboard.employees.record(user.id) : undefined;

  return (
    <DashboardContent {...other}>
      <CustomBreadcrumbs
        heading="Account"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User', href: paths.dashboard.user.root },
          { name: 'Account' },
        ]}
        action={
          myRecordHref && (
            <Button
              component={RouterLink}
              href={myRecordHref}
              variant="outlined"
              startIcon={<Iconify icon="solar:add-folder-bold" />}
            >
              My E-record
            </Button>
          )
        }
        sx={{ mb: 3 }}
      />

      <Tabs value={removeLastSlash(pathname)} sx={{ mb: { xs: 3, md: 5 } }}>
        {NAV_ITEMS.map((tab) => (
          <Tab
            component={RouterLink}
            key={tab.href}
            label={tab.label}
            icon={tab.icon}
            value={tab.href}
            href={tab.href}
          />
        ))}
      </Tabs>

      {children}
    </DashboardContent>
  );
}
