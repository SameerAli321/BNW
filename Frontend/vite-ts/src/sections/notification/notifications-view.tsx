import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { NotificationItem } from 'src/layouts/components/notifications-popover';
import {
  useGetNotifications,
  setNotifyAllRequests,
  REQUEST_WATCHER_ROLES,
  markAllNotificationsRead,
} from 'src/actions/notifications';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

/**
 * HR / Admin / CEO: "Notify me about every new request" — a bell notification and an email
 * whenever anyone submits a request or form.
 */
function WatchAllRequestsCard() {
  const { user, checkUserSession } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  if (!user || !REQUEST_WATCHER_ROLES.includes(user.role)) return null;

  const checked = optimistic ?? !!user.notifyAllRequests;

  const onToggle = async (enabled: boolean) => {
    setOptimistic(enabled);
    setSaving(true);
    try {
      await setNotifyAllRequests(enabled);
      await checkUserSession?.();
      toast.success(
        enabled
          ? 'You will now be notified about every new request'
          : 'You will only get notifications for things that need you'
      );
    } catch (error) {
      setOptimistic(null);
      toast.error(error instanceof Error ? error.message : 'Could not save the setting');
    } finally {
      setSaving(false);
      setOptimistic(null);
    }
  };

  return (
    <Card sx={{ p: 2.5, mb: 3 }}>
      <FormControlLabel
        sx={{ m: 0, width: 1, justifyContent: 'space-between', alignItems: 'flex-start' }}
        labelPlacement="start"
        control={
          <Switch
            checked={checked}
            disabled={saving}
            onChange={(event) => onToggle(event.target.checked)}
          />
        }
        label={
          <Stack spacing={0.5} sx={{ pr: 2 }}>
            <Typography variant="subtitle1">Notify me about every new request</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Get a notification here and an email whenever anyone submits a leave request,
              attendance regularization, complaint, onboarding form, reimbursement or equipment
              request, or appraisal request — even when it doesn&apos;t need your approval.
            </Typography>
          </Stack>
        }
      />
    </Card>
  );
}

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

      <WatchAllRequestsCard />

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
