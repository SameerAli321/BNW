import { useBoolean } from 'minimal-shared/hooks';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { fToNow } from 'src/utils/format-time';

import { useGetAnnouncements, ANNOUNCEMENT_POSTER_ROLES } from 'src/actions/announcements';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { AnnouncementDialog } from 'src/sections/announcement/announcement-components';

import { useAuthContext } from 'src/auth/hooks';

import {
  CardLink,
  DashboardList,
  DashboardListRow,
  DashboardCardHeader,
  DashboardListSkeleton,
} from './dashboard-widgets';

// ----------------------------------------------------------------------

// Rotating soft tints so the list reads like the mockup; pinned posts are always amber.
const ROW_COLORS = ['primary', 'success', 'info'] as const;

// BNW OMS: "Recent announcements" on every role's dashboard — the latest few posts as one-line
// rows (pinned ones get an amber star icon) linking to the full board, with Post for CEO / ADMIN /
// HR (same ANNOUNCEMENT_POSTER_ROLES gate and dialog the board page uses).
export function DashboardAnnouncements() {
  const { user } = useAuthContext();
  const canPost = ANNOUNCEMENT_POSTER_ROLES.includes(user?.role ?? '');
  const postDialog = useBoolean();
  const { announcements, announcementsLoading } = useGetAnnouncements({ limit: 4 });

  return (
    <Card sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
      <DashboardCardHeader
        title="Recent announcements"
        icon="solar:bell-bing-bold"
        action={
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {canPost && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<Iconify icon="mingcute:add-line" width={18} />}
                onClick={postDialog.onTrue}
              >
                Post
              </Button>
            )}
            <CardLink href={paths.dashboard.announcements} />
          </Stack>
        }
      />

      {announcementsLoading ? (
        <DashboardListSkeleton rows={3} />
      ) : !announcements.length ? (
        <EmptyContent
          title="No announcements right now"
          description="Notices posted for you or your department will show up here."
          sx={{ py: 5, flexGrow: 1 }}
          slotProps={{ img: { sx: { maxWidth: 96 } } }}
        />
      ) : (
        <DashboardList>
          {announcements.map((a, index) => (
            <DashboardListRow
              key={a.id}
              href={paths.dashboard.announcements}
              icon={a.pinned ? 'eva:star-fill' : 'solar:bell-bing-bold'}
              color={a.pinned ? 'warning' : ROW_COLORS[index % ROW_COLORS.length]}
              title={a.title}
              secondary={a.body}
              dimmed={a.isExpired}
              meta={
                <Typography variant="caption" sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                  {fToNow(a.createdAt)}
                </Typography>
              }
            />
          ))}
        </DashboardList>
      )}

      {canPost && postDialog.value && <AnnouncementDialog open onClose={postDialog.onFalse} />}
    </Card>
  );
}
