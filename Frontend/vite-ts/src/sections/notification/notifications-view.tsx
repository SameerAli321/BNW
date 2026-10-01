import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { NotificationItem } from 'src/layouts/components/notifications-popover';
import { useGetNotifications, markAllNotificationsRead } from 'src/actions/notifications';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

/** Every notification of the signed-in user (latest 200), with an Unread filter. */
export function NotificationsView() {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const { notifications, unreadCount, notificationsLoading } = useGetNotifications({
    limit: 200,
    unreadOnly: tab === 'unread',
  });

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading="Notifications"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Notifications' }]}
        action={
          !!unreadCount && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:done-all-fill" />}
              onClick={() => markAllNotificationsRead()}
            >
              Mark all as read
            </Button>
          )
        }
        sx={{ mb: 3 }}
      />

      <Card>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
        >
          <Tab value="all" label="All" />
          <Tab
            value="unread"
            label="Unread"
            iconPosition="end"
            icon={
              unreadCount ? (
                <Label variant="filled" color="info">
                  {unreadCount}
                </Label>
              ) : undefined
            }
          />
        </Tabs>

        {!notificationsLoading && !notifications.length && (
          <Stack alignItems="center" spacing={1} sx={{ py: 10, color: 'text.disabled' }}>
            <Iconify icon="solar:bell-off-bold" width={48} />
            <Typography variant="body2">
              {tab === 'unread' ? 'Nothing unread' : 'No notifications yet'}
            </Typography>
          </Stack>
        )}
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </Card>
    </DashboardContent>
  );
}
