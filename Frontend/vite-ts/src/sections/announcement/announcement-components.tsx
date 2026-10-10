import type { AnnouncementDto, AnnouncementAudience } from 'src/actions/announcements';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate, fToNow } from 'src/utils/format-time';

import { useGetDepartments } from 'src/actions/users';
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  useGetAnnouncements,
  ANNOUNCEMENT_POSTER_ROLES,
} from 'src/actions/announcements';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type DialogProps = {
  open: boolean;
  onClose: () => void;
  current?: AnnouncementDto;
};

/** Post a new announcement, or edit one (the poster or an Admin). */
export function AnnouncementDialog({ open, onClose, current }: DialogProps) {
  const { departments } = useGetDepartments();
  const [title, setTitle] = useState(current?.title ?? '');
  const [body, setBody] = useState(current?.body ?? '');
  const [audience, setAudience] = useState<AnnouncementAudience>(current?.audience ?? 'ALL');
  const [departmentId, setDepartmentId] = useState<number | ''>(current?.departmentId ?? '');
  const [pinned, setPinned] = useState(current?.pinned ?? false);
  const [expiresOn, setExpiresOn] = useState(current?.expiresOn ?? '');
  const [saving, setSaving] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const onSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Give the announcement a title and a message');
      return;
    }
    if (audience === 'DEPARTMENT' && departmentId === '') {
      toast.error('Choose the department');
      return;
    }
    const payload = {
      title,
      body,
      audience,
      departmentId: audience === 'DEPARTMENT' ? Number(departmentId) : null,
      pinned,
      expiresOn: expiresOn || null,
    };
    setSaving(true);
    try {
      if (current) {
        await updateAnnouncement(current.id, payload);
        toast.success('Announcement updated!');
      } else {
        await createAnnouncement(payload);
        toast.success('Announcement posted — everyone it’s for has been notified');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>{current ? 'Edit announcement' : 'New announcement'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />
          <TextField
            label="Message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            multiline
            minRows={5}
            slotProps={{ htmlInput: { maxLength: 10000 } }}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Who sees it"
              value={audience}
              onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}
              fullWidth
            >
              <MenuItem value="ALL">Everyone at BNW</MenuItem>
              <MenuItem value="DEPARTMENT">One department</MenuItem>
            </TextField>
            {audience === 'DEPARTMENT' && (
              <TextField
                select
                label="Department"
                value={departmentId}
                onChange={(event) => setDepartmentId(Number(event.target.value))}
                fullWidth
              >
                {departments.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              type="date"
              label="Show until (optional)"
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Leave blank to keep it until it's removed"
              fullWidth
            />
            <FormControlLabel
              control={<Switch checked={pinned} onChange={(event) => setPinned(event.target.checked)} />}
              label="Pin to top"
              sx={{ flexShrink: 0 }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" loading={saving} onClick={onSave}>
          {current ? 'Save' : 'Post announcement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

type ItemProps = {
  announcement: AnnouncementDto;
  compact?: boolean;
};

/** One announcement: title, who posted it and when, the message, and manage controls if allowed. */
export function AnnouncementItem({ announcement: a, compact }: ItemProps) {
  const { user } = useAuthContext();
  const editDialog = useBoolean();
  const [expanded, setExpanded] = useState(false);
  const canManage = !compact && (user?.role === 'ADMIN' || (!!user?.id && user.id === a.postedBy));
  const long = a.body.length > (compact ? 180 : 400);

  const onDelete = async () => {
    if (!window.confirm(`Delete the announcement "${a.title}"?`)) return;
    try {
      await deleteAnnouncement(a.id);
      toast.success('Announcement deleted');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Delete failed!');
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 1.5,
        position: 'relative',
        bgcolor: (theme) =>
          a.pinned ? varAlpha(theme.vars.palette.warning.mainChannel, 0.08) : 'background.neutral',
        opacity: a.isExpired ? 0.6 : 1,
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1, mb: 0.5 }}>
            {a.pinned && <Iconify icon="eva:star-fill" width={18} sx={{ color: 'warning.main' }} />}
            <Typography variant="subtitle1">{a.title}</Typography>
            {a.audience === 'DEPARTMENT' && (
              <Label variant="soft" color="info">
                {a.departmentName ?? 'Department'}
              </Label>
            )}
            {a.isExpired && (
              <Label variant="soft" color="default">
                Expired
              </Label>
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {a.posterName ?? 'BNW'}
            {a.posterRole ? ` · ${a.posterRole}` : ''} · {fToNow(a.createdAt)}
            {a.expiresOn ? ` · until ${fDate(a.expiresOn)}` : ''}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              ...(long && !expanded
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: compact ? 3 : 6,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }
                : {}),
            }}
          >
            {a.body}
          </Typography>
          {long && (
            <Button size="small" sx={{ mt: 0.5, px: 0 }} onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show less' : 'Read more'}
            </Button>
          )}
        </Box>
        {canManage && (
          <Stack direction="row">
            <Tooltip title="Edit">
              <IconButton size="small" onClick={editDialog.onTrue}>
                <Iconify icon="solar:pen-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={onDelete}>
                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
      {canManage && editDialog.value && (
        <AnnouncementDialog open onClose={editDialog.onFalse} current={a} />
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

/** Dashboard widget: the latest few announcements for everyone, with Post for CEO / ADMIN / HR. */
export function AnnouncementBoard() {
  const { user } = useAuthContext();
  const canPost = ANNOUNCEMENT_POSTER_ROLES.includes(user?.role ?? '');
  const postDialog = useBoolean();
  const { announcements, announcementsLoading } = useGetAnnouncements({ limit: 3 });

  return (
    <Card sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ gap: 1.5, mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
            }}
          >
            <Iconify icon="solar:chat-round-dots-bold" width={24} />
          </Box>
          <Typography variant="h6">Announcements</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          {canPost && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={postDialog.onTrue}
            >
              Post
            </Button>
          )}
          <Button component={RouterLink} href={paths.dashboard.announcements} size="small" color="inherit">
            View all
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={1.5}>
        {announcements.map((announcement) => (
          <AnnouncementItem key={announcement.id} announcement={announcement} compact />
        ))}
        {!announcementsLoading && !announcements.length && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
            No announcements right now.
          </Typography>
        )}
      </Stack>

      {canPost && postDialog.value && <AnnouncementDialog open onClose={postDialog.onFalse} />}
    </Card>
  );
}
