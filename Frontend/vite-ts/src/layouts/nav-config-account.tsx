import type { AccountDrawerProps } from './components/account-drawer';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// BNW OMS: the avatar menu (top right). Was the template's demo list (Projects, Subscription, …
// all dead links) — now the user's own account pages.
export const _account: AccountDrawerProps['data'] = [
  {
    label: 'Dashboard',
    href: paths.dashboard.root,
    icon: <Iconify icon="solar:home-angle-bold-duotone" />,
  },
  {
    label: 'My profile & photo',
    href: paths.dashboard.user.account,
    icon: <Iconify icon="solar:user-id-bold" />,
  },
  {
    label: 'Personal details',
    href: paths.dashboard.user.accountPersonalDetails,
    icon: <Iconify icon="solar:notes-bold-duotone" />,
  },
  {
    label: 'Change password',
    href: `${paths.dashboard.user.account}/change-password`,
    icon: <Iconify icon="solar:shield-keyhole-bold-duotone" />,
  },
  {
    label: 'My E-record',
    href: paths.dashboard.myRecord,
    icon: <Iconify icon="solar:file-text-bold" />,
  },
  {
    label: 'Notifications',
    href: paths.dashboard.notifications,
    icon: <Iconify icon="solar:bell-bing-bold-duotone" />,
  },
];
