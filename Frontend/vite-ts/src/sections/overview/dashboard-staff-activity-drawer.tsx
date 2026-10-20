import type { IconifyName } from 'src/components/iconify';
import type { TeamStatusRow, StaffActivityKind, StaffActivityItem } from 'src/actions/team-status';

import { useMemo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { useGetStaffActivity } from 'src/actions/team-status';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

type PaletteColor = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

const KIND_META: Record<StaffActivityKind, { label: string; icon: IconifyName; color: PaletteColor }> =
  {
    LEAVE: { label: 'Leave', icon: 'solar:calendar-date-bold', color: 'warning' },
    ATTENDANCE: { label: 'Attendance', icon: 'solar:clock-circle-bold', color: 'info' },
    WORK_ORDER: { label: 'Work orders', icon: 'solar:bill-list-bold', color: 'secondary' },
    APPRAISAL: { label: 'Appraisals', icon: 'solar:cup-star-bold', color: 'primary' },
    LETTER: { label: 'Letters', icon: 'solar:letter-bold', color: 'primary' },
    COMPLAINT: { label: 'Complaints', icon: 'solar:chat-round-dots-bold', color: 'error' },
    FORM: { label: 'Forms sent', icon: 'solar:file-check-bold-duotone', color: 'info' },
    MEETING: { label: 'Meetings', icon: 'solar:users-group-rounded-bold', color: 'success' },
    DAILY_LOG: { label: 'Daily log', icon: 'solar:notebook-bold-duotone', color: 'secondary' },
    DOCUMENT: { label: 'Documents', icon: 'solar:file-text-bold', color: 'info' },
  };

/** 'PENDING_MANAGER' → 'Pending manager'. */
const statusText = (status: string) =>
  status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');

function statusColor(item: StaffActivityItem): 'default' | 'success' | 'warning' | 'error' {
  if (item.inProgress) return 'warning';
  const s = item.status ?? '';
  if (/REJECTED|CANCELLED|NOT_IN_ORDER|NOT_RECOMMENDED/.test(s)) return 'error';
  if (/APPROVED|ACCEPTED|SIGNED|COMPLETED|RESOLVED|TAKEN_ON_RECORD|CONFIRMED/.test(s)) {
    return 'success';
  }
  return 'default';
}

type Filter = 'ALL' | 'IN_PROGRESS' | StaffActivityKind;

type Props = {
  person: TeamStatusRow | null;
  onClose: () => void;
};

/**
 * Opened from a "Staff status" row: everything that person has going on — leave, attendance,
 * work orders, appraisals, letters, forms sent to them, meetings, daily log entries and E-record
 * documents (complaints too for CEO / HR / Admin) — newest first, filterable by kind, each linking
 * to its own page.
 */
export function DashboardStaffActivityDrawer({ person, onClose }: Props) {
  const { items, loading, error } = useGetStaffActivity(person?.id ?? null);
  const [filter, setFilter] = useState<Filter>('ALL');

  const counts = useMemo(() => {
    const byKind = new Map<StaffActivityKind, number>();
    items.forEach((item) => byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + 1));
    return byKind;
  }, [items]);
  const inProgress = items.filter((item) => item.inProgress).length;

  const shown = items.filter((item) =>
    filter === 'ALL' ? true : filter === 'IN_PROGRESS' ? item.inProgress : item.kind === filter
  );

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'ALL', label: 'All', count: items.length },
    { value: 'IN_PROGRESS', label: 'In progress', count: inProgress },
    ...(Object.keys(KIND_META) as StaffActivityKind[])
      .filter((kind) => counts.get(kind))
      .map((kind) => ({ value: kind, label: KIND_META[kind].label, count: counts.get(kind) ?? 0 })),
  ];

  const handleClose = () => {
    setFilter('ALL');
    onClose();
  };

  const renderItem = (item: StaffActivityItem) => {
    const meta = KIND_META[item.kind];
    return (
      <ButtonBase
        key={`${item.kind}-${item.id}`}
        component={RouterLink}
        href={item.link}
        sx={(theme) => ({
          p: 1.5,
          gap: 1.5,
          width: 1,
          borderRadius: 1.5,
          textAlign: 'left',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          '&:hover': { bgcolor: 'action.hover' },
          ...(item.inProgress && {
            bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.06),
          }),
        })}
      >
        <Avatar
          sx={(theme) => ({
            width: 36,
            height: 36,
            color: `${meta.color}.main`,
            bgcolor: varAlpha(theme.vars.palette[meta.color].mainChannel, 0.12),
          })}
        >
          <Iconify icon={meta.icon} width={20} />
        </Avatar>

        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ flex: '1 1 auto' }}>
              {item.title || meta.label}
            </Typography>
            {item.status && (
              <Label color={statusColor(item)} sx={{ flexShrink: 0 }}>
                {statusText(item.status)}
              </Label>
            )}
          </Stack>
          {item.detail && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.detail}
            </Typography>
          )}
          <Tooltip title={fDateTime(item.at)}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {meta.label} · {fToNow(item.at)}
            </Typography>
          </Tooltip>
        </Box>
      </ButtonBase>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={!!person}
      onClose={handleClose}
      slotProps={{ paper: { sx: { width: { xs: 1, sm: 480 } } } }}
    >
      {person && (
        <>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2.5, pb: 2 }}>
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {person.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                {[person.designation, person.department].filter(Boolean).join(' · ') ||
                  person.email}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              component={RouterLink}
              href={paths.dashboard.employees.record(person.id)}
              startIcon={<Iconify icon="solar:file-text-bold" />}
            >
              E-record
            </Button>
            <IconButton aria-label="Close" onClick={handleClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <Box sx={{ px: 2.5, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {filters.map((f) => (
              <Chip
                key={f.value}
                size="small"
                label={`${f.label} ${f.count}`}
                color={filter === f.value ? 'primary' : 'default'}
                variant={filter === f.value ? 'filled' : 'outlined'}
                onClick={() => setFilter(f.value)}
              />
            ))}
          </Box>

          <Divider />

          <Scrollbar sx={{ flex: '1 1 auto' }}>
            <Stack spacing={0.5} sx={{ p: 1.5 }}>
              {loading &&
                [0, 1, 2, 3, 4].map((n) => (
                  <Stack key={n} direction="row" spacing={1.5} sx={{ p: 1.5 }}>
                    <Skeleton variant="circular" width={36} height={36} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" />
                      <Skeleton width="90%" />
                    </Box>
                  </Stack>
                ))}

              {!loading && error && (
                <EmptyContent
                  title="Couldn't load this activity"
                  description={error instanceof Error ? error.message : undefined}
                  sx={{ py: 6 }}
                />
              )}

              {!loading && !error && !shown.length && (
                <EmptyContent
                  title={items.length ? 'Nothing here' : 'No activity yet'}
                  description={
                    items.length ? 'Try another filter.' : 'Requests, letters and meetings will show here.'
                  }
                  sx={{ py: 6 }}
                />
              )}

              {!loading && !error && shown.map(renderItem)}
            </Stack>
          </Scrollbar>
        </>
      )}
    </Drawer>
  );
}
