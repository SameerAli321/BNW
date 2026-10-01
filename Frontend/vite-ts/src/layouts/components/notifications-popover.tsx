import type { NotificationDto } from 'src/actions/notifications';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import {
  notificationVisual,
  useGetNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from 'src/actions/notifications';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type ItemProps = {
  notification: NotificationDto;
  onOpen?: () => void;
};

/** One notification row — click opens what it's about and marks it read. */
export function NotificationItem({ notification: n, onOpen }: ItemProps) {
  const router = useRouter();
  const visual = notificationVisual(n.type);
  const unread = !n.readAt;

  const handleClick = async () => {
    onOpen?.();
    if (unread) markNotificationRead(n.id).catch(() => undefined);
    if (n.link) router.push(n.link);
  };

  return (
    <ButtonBase
      onClick={handleClick}
      sx={{
        px: 2.5,
        py: 1.5,
        width: 1,
        gap: 2,
        display: 'flex',
        textAlign: 'left',
        alignItems: 'flex-start',
        borderBottom: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
        bgcolor: (theme) => (unread ? varAlpha(theme.vars.palette.primary.mainChannel, 0.06) : 'transparent'),
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: `${visual.color}.main`,
          bgcolor: (theme) => varAlpha(theme.vars.palette[visual.color].mainChannel, 0.12),
        }}
      >
        <Iconify icon={visual.icon} width={22} />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: unread ? 600 : 400, mb: 0.25 }}>
          {n.title}
        </Typography>
        {n.body && (
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mb: 0.25 }}>
            {n.body}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {fToNow(n.createdAt)}
        </Typography>
      </Box>
      {unread && (
        <Box sx={{ width: 8, height: 8, mt: 1, flexShrink: 0, borderRadius: '50%', bgcolor: 'info.main' }} />
      )}
    </ButtonBase>
  );
}

// ----------------------------------------------------------------------

/** The bell in the header: unread badge, latest notifications, "mark all as read". */
export function NotificationsPopover() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { notifications, unreadCount, notificationsLoading } = useGetNotifications({ limit: 20 });
  const close = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          aria-label="Notifications"
          color={anchorEl ? 'primary' : 'default'}
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Iconify icon="solar:bell-bing-bold-duotone" width={24} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: 'calc(100vw - 32px)', mt: 1 } } }}
      >
        <Stack direction="row" alignItems="center" sx={{ py: 2, pl: 2.5, pr: 1.5 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">Notifications</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {unreadCount ? `You have ${unreadCount} unread` : 'You’re all caught up'}
            </Typography>
          </Box>
          {!!unreadCount && (
            <Tooltip title="Mark all as read">
              <IconButton color="primary" onClick={() => markAllNotificationsRead()}>
                <Iconify icon="eva:done-all-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Divider />

        <Scrollbar sx={{ maxHeight: 440 }}>
          {!notificationsLoading && !notifications.length && (
            <Stack alignItems="center" spacing={1} sx={{ py: 6, color: 'text.disabled' }}>
              <Iconify icon="solar:bell-off-bold" width={40} />
              <Typography variant="body2">No notifications yet</Typography>
            </Stack>
          )}
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onOpen={close} />
          ))}
        </Scrollbar>

        <Box sx={{ p: 1 }}>
          <Button fullWidth size="large" component={RouterLink} href={paths.dashboard.notifications} onClick={close}>
            View all
          </Button>
        </Box>
      </Popover>
    </>
  );
}
