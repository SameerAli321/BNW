import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetAnnouncements, ANNOUNCEMENT_POSTER_ROLES } from 'src/actions/announcements';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { AnnouncementItem, AnnouncementDialog } from '../announcement-components';

// ----------------------------------------------------------------------

/**
 * The full announcement board. Everyone sees what's addressed to them; CEO / ADMIN / HR can post,
 * and the poster (or an Admin) can edit or delete. Posters can also show expired ones.
 */
export function AnnouncementsView() {
  const { user } = useAuthContext();
  const canPost = ANNOUNCEMENT_POSTER_ROLES.includes(user?.role ?? '');
  const postDialog = useBoolean();
  const [includeExpired, setIncludeExpired] = useState(false);
  const { announcements, announcementsLoading } = useGetAnnouncements({
    includeExpired: canPost && includeExpired,
  });

  return (
    <DashboardContent maxWidth="md">
      <CustomBreadcrumbs
        heading="Announcements"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Announcements' }]}
        action={
          canPost && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={postDialog.onTrue}
            >
              New announcement
            </Button>
          )
        }
        sx={{ mb: 3 }}
      />

      {canPost && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={includeExpired}
                onChange={(event) => setIncludeExpired(event.target.checked)}
              />
            }
            label="Show expired"
          />
        </Stack>
      )}

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          {announcements.map((announcement) => (
            <AnnouncementItem key={announcement.id} announcement={announcement} />
          ))}
          {!announcementsLoading && !announcements.length && (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}>
              No announcements yet.
            </Typography>
          )}
        </Stack>
      </Card>

      {canPost && postDialog.value && <AnnouncementDialog open onClose={postDialog.onFalse} />}
    </DashboardContent>
  );
}
