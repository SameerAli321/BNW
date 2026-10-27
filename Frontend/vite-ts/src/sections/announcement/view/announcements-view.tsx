import type { AnnouncementDto } from 'src/actions/announcements';

import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetAnnouncements, ANNOUNCEMENT_POSTER_ROLES } from 'src/actions/announcements';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import {
  AnnouncementHero,
  AnnouncementCard,
  AnnouncementDialog,
  AnnouncementsSkeleton,
} from '../announcement-components';

// ----------------------------------------------------------------------

type DateFilter = 'any' | 'today' | 'week' | 'month' | 'year';

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'year', label: 'This year' },
];

/** First moment a post must be newer than for each date filter (null = no limit). */
function dateFloor(filter: DateFilter): dayjs.Dayjs | null {
  switch (filter) {
    case 'today':
      return dayjs().startOf('day');
    case 'week':
      return dayjs().subtract(6, 'day').startOf('day');
    case 'month':
      return dayjs().subtract(29, 'day').startOf('day');
    case 'year':
      return dayjs().startOf('year');
    default:
      return null;
  }
}

/** '' = all audiences, 'ALL' = company-wide only, otherwise a department id. */
type AudienceFilter = '' | 'ALL' | number;

/**
 * The full announcement board. Everyone sees what's addressed to them; CEO / ADMIN / HR can post,
 * and the poster (or an Admin) can edit or delete. Posters can also show expired ones. The newest
 * pinned post (or the newest post) is featured on top, the rest in a card grid; search and the
 * audience / date filters run in the browser over what the API returned.
 */
export function AnnouncementsView() {
  const { user } = useAuthContext();
  const canPost = ANNOUNCEMENT_POSTER_ROLES.includes(user?.role ?? '');
  const postDialog = useBoolean();
  const [includeExpired, setIncludeExpired] = useState(false);
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');

  const { announcements, announcementsLoading } = useGetAnnouncements({
    includeExpired: canPost && includeExpired,
  });

  // Departments that actually have posts, for the audience filter.
  const departmentOptions = useMemo(() => {
    const map = new Map<number, string>();
    announcements.forEach((a) => {
      if (a.audience === 'DEPARTMENT') {
        a.departmentIds.forEach((id, i) =>
          map.set(id, a.departmentNames[i] ?? `Department #${id}`)
        );
      }
    });
    return [...map.entries()].sort((x, y) => x[1].localeCompare(y[1]));
  }, [announcements]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const floor = dateFloor(dateFilter);
    return announcements.filter((a) => {
      if (
        query &&
        ![a.title, a.body, a.posterName ?? '', ...a.departmentNames].some((text) =>
          text.toLowerCase().includes(query)
        )
      ) {
        return false;
      }
      if (audienceFilter === 'ALL' && a.audience !== 'ALL') return false;
      if (typeof audienceFilter === 'number' && !a.departmentIds.includes(audienceFilter)) {
        return false;
      }
      if (floor && dayjs(a.createdAt).isBefore(floor)) return false;
      return true;
    });
  }, [announcements, search, audienceFilter, dateFilter]);

  // The API already orders pinned first, then newest — so the first one is the one to feature.
  const featured: AnnouncementDto | undefined = filtered[0];
  const rest = filtered.slice(1);

  const hasFilters = !!search.trim() || audienceFilter !== '' || dateFilter !== 'any';
  const clearFilters = () => {
    setSearch('');
    setAudienceFilter('');
    setDateFilter('any');
  };

  const renderToolbar = () => (
    <Card sx={{ p: 2, mb: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search announcements..."
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="Audience"
          value={audienceFilter}
          onChange={(event) => {
            const value = event.target.value as string | number;
            setAudienceFilter(value === '' || value === 'ALL' ? value : Number(value));
          }}
          sx={{ minWidth: { md: 200 } }}
        >
          <MenuItem value="">All audiences</MenuItem>
          <MenuItem value="ALL">Everyone at BNW</MenuItem>
          {departmentOptions.map(([id, name]) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Posted"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value as DateFilter)}
          sx={{ minWidth: { md: 160 } }}
        >
          {DATE_FILTERS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        {canPost && (
          <FormControlLabel
            control={
              <Switch
                checked={includeExpired}
                onChange={(event) => setIncludeExpired(event.target.checked)}
              />
            }
            label="Show expired"
            sx={{ flexShrink: 0, mr: 0 }}
          />
        )}
      </Stack>

      {hasFilters && !announcementsLoading && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <strong>{filtered.length}</strong> of {announcements.length} announcement
            {announcements.length === 1 ? '' : 's'}
          </Typography>
          <Button
            size="small"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={clearFilters}
          >
            Clear
          </Button>
        </Stack>
      )}
    </Card>
  );

  const renderContent = () => {
    if (announcementsLoading) return <AnnouncementsSkeleton />;

    if (!filtered.length) {
      return (
        <Card>
          <EmptyContent
            title={hasFilters ? 'No matching announcements' : 'No announcements yet'}
            description={
              hasFilters
                ? 'Try a different search or clear the filters.'
                : canPost
                  ? 'Share news, policies or reminders with everyone or chosen departments.'
                  : 'Notices posted for you or your department will show up here.'
            }
            action={
              hasFilters ? (
                <Button variant="outlined" color="inherit" onClick={clearFilters} sx={{ mt: 2 }}>
                  Clear filters
                </Button>
              ) : (
                canPost && (
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={postDialog.onTrue}
                    sx={{ mt: 2 }}
                  >
                    Post announcement
                  </Button>
                )
              )
            }
            sx={{ py: 8 }}
          />
        </Card>
      );
    }

    return (
      <Stack spacing={3}>
        {featured && <AnnouncementHero announcement={featured} />}

        {!!rest.length && (
          <Box>
            <Typography variant="overline" sx={{ display: 'block', mb: 2, color: 'text.disabled' }}>
              {featured?.pinned ? 'More announcements' : 'Earlier'}
            </Typography>
            <Grid container spacing={3}>
              {rest.map((announcement) => (
                <Grid key={announcement.id} size={{ xs: 12, md: 6 }}>
                  <AnnouncementCard announcement={announcement} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Stack>
    );
  };

  return (
    <DashboardContent maxWidth="lg">
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
              Post announcement
            </Button>
          )
        }
        sx={{ mb: 1 }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Company news, policies and reminders — for everyone at BNW or for your department.
      </Typography>

      {renderToolbar()}
      {renderContent()}

      {canPost && postDialog.value && <AnnouncementDialog open onClose={postDialog.onFalse} />}
    </DashboardContent>
  );
}
