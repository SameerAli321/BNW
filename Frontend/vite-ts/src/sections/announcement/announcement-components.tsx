import type { Theme, SxProps } from '@mui/material/styles';
import type { AnnouncementDto, AnnouncementAudience } from 'src/actions/announcements';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

import { useGetDepartments } from 'src/actions/users';
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from 'src/actions/announcements';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type AccentColor = 'primary' | 'info' | 'warning';

/**
 * The colour that marks an announcement: amber when pinned, blue for a single department, the
 * brand colour for company-wide posts. Expired ones keep their colour but are dimmed by the card.
 */
export function announcementAccent(a: Pick<AnnouncementDto, 'pinned' | 'audience'>): AccentColor {
  if (a.pinned) return 'warning';
  return a.audience === 'DEPARTMENT' ? 'info' : 'primary';
}

const initialsOf = (name: string | null) =>
  (name ?? 'BNW')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: 'Team Member',
  MANAGER: 'Team Lead',
  HR: 'HR',
  CEO: 'CEO',
  ADMIN: 'Admin',
  PAYROLL: 'Accountant',
};

/** Who the post is for, as a small chip. */
function AudienceChip({ a }: { a: Pick<AnnouncementDto, 'audience' | 'departmentNames'> }) {
  return a.audience === 'DEPARTMENT' ? (
    <Label
      variant="soft"
      color="info"
      startIcon={<Iconify icon="solar:case-minimalistic-bold" width={14} />}
      title={a.departmentNames.join(', ')}
    >
      {a.departmentNames.length === 0
        ? 'Departments'
        : a.departmentNames.length <= 2
          ? a.departmentNames.join(', ')
          : `${a.departmentNames.length} departments`}
    </Label>
  ) : (
    <Label
      variant="soft"
      color="primary"
      startIcon={<Iconify icon="solar:users-group-rounded-bold" width={14} />}
    >
      Everyone
    </Label>
  );
}

/** Avatar + poster name / role + relative time (full date on hover). */
function PosterLine({
  a,
  accent,
  dense,
}: {
  a: AnnouncementDto;
  accent: AccentColor;
  dense?: boolean;
}) {
  const size = dense ? 32 : 40;
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
      <Avatar
        alt={a.posterName ?? 'BNW'}
        sx={{
          width: size,
          height: size,
          typography: dense ? 'caption' : 'subtitle2',
          fontWeight: 'fontWeightBold',
          color: `${accent}.main`,
          bgcolor: (theme) => varAlpha(theme.vars.palette[accent].mainChannel, 0.16),
        }}
      >
        {initialsOf(a.posterName)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>
          {a.posterName ?? 'BNW'}
        </Typography>
        <Typography variant="caption" component="div" sx={{ color: 'text.disabled' }} noWrap>
          {a.posterRole ? `${ROLE_LABEL[a.posterRole] ?? a.posterRole} · ` : ''}
          <Tooltip title={fDateTime(a.createdAt)}>
            <span>{fToNow(a.createdAt)}</span>
          </Tooltip>
          {a.updatedAt && a.updatedAt !== a.createdAt ? ' · edited' : ''}
        </Typography>
      </Box>
    </Stack>
  );
}

/** Message text clamped to `lines`, with Read more / Show less when it's long. */
function ExpandableBody({
  body,
  lines,
  threshold,
  variant = 'body2',
}: {
  body: string;
  lines: number;
  threshold: number;
  variant?: 'body1' | 'body2';
}) {
  const [expanded, setExpanded] = useState(false);
  const long = body.length > threshold || body.split('\n').length > lines;

  return (
    <Box>
      <Typography
        variant={variant}
        sx={{
          color: 'text.secondary',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...(long && !expanded
            ? {
                display: '-webkit-box',
                WebkitLineClamp: lines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : {}),
        }}
      >
        {body}
      </Typography>
      {long && (
        <Button
          size="small"
          color="inherit"
          onClick={() => setExpanded((value) => !value)}
          endIcon={
            <Iconify
              icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
              width={16}
            />
          }
          sx={{ mt: 0.5, px: 0.5, ml: -0.5, color: 'text.primary' }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </Box>
  );
}

/** Edit / delete for the poster or an Admin (never in previews). */
function ManageActions({ a }: { a: AnnouncementDto }) {
  const editDialog = useBoolean();
  const confirmDelete = useBoolean();
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteAnnouncement(a.id);
      toast.success('Announcement deleted');
      confirmDelete.onFalse();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Delete failed!');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Stack direction="row" sx={{ flexShrink: 0 }}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={editDialog.onTrue}>
            <Iconify icon="solar:pen-bold" width={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={confirmDelete.onTrue}>
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      {editDialog.value && <AnnouncementDialog open onClose={editDialog.onFalse} current={a} />}

      <ConfirmDialog
        open={confirmDelete.value}
        onClose={confirmDelete.onFalse}
        title="Delete announcement?"
        content={`"${a.title}" will be removed for everyone.`}
        action={
          <Button variant="contained" color="error" loading={deleting} onClick={onDelete}>
            Delete
          </Button>
        }
      />
    </>
  );
}

function useCanManage(a: AnnouncementDto, preview?: boolean) {
  const { user } = useAuthContext();
  return !preview && (user?.role === 'ADMIN' || (!!user?.id && user.id === a.postedBy));
}

// ----------------------------------------------------------------------

type CardProps = {
  announcement: AnnouncementDto;
  /** Live preview inside the post dialog — no manage buttons. */
  preview?: boolean;
  sx?: SxProps<Theme>;
};

/** Feed card: coloured left accent, title, audience chip, clamped message, poster + time. */
export function AnnouncementCard({ announcement: a, preview, sx }: CardProps) {
  const accent = announcementAccent(a);
  const canManage = useCanManage(a, preview);

  return (
    <Card
      sx={[
        (theme) => ({
          p: 2.5,
          pl: 3,
          height: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          position: 'relative',
          overflow: 'hidden',
          opacity: a.isExpired ? 0.64 : 1,
          transition: theme.transitions.create(['box-shadow', 'transform']),
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 4,
            bgcolor: `${accent}.main`,
          },
          ...(!preview && {
            '&:hover': { boxShadow: theme.vars.customShadows.z12, transform: 'translateY(-2px)' },
          }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 0.75, flexGrow: 1 }}>
          {a.pinned && (
            <Label
              variant="soft"
              color="warning"
              startIcon={<Iconify icon="eva:star-fill" width={14} />}
            >
              Pinned
            </Label>
          )}
          <AudienceChip a={a} />
          {a.isExpired && (
            <Label variant="soft" color="default">
              Expired
            </Label>
          )}
        </Stack>
        {canManage && <ManageActions a={a} />}
      </Stack>

      <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
        {a.title || 'Untitled announcement'}
      </Typography>

      <ExpandableBody body={a.body || 'Your message will appear here.'} lines={4} threshold={260} />

      <Divider sx={{ borderStyle: 'dashed', mt: 'auto' }} />

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <PosterLine a={a} accent={accent} dense />
        {a.expiresOn && (
          <Tooltip title="Shown until this day">
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:clock-circle-bold" width={14} />
              {fDate(a.expiresOn)}
            </Typography>
          </Tooltip>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

/** The featured post at the top of the board — the newest pinned one, else the newest. */
export function AnnouncementHero({ announcement: a }: { announcement: AnnouncementDto }) {
  const accent = announcementAccent(a);
  const canManage = useCanManage(a);

  return (
    <Card
      sx={(theme) => ({
        p: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        opacity: a.isExpired ? 0.64 : 1,
        border: `solid 1px ${varAlpha(theme.vars.palette[accent].mainChannel, 0.24)}`,
        backgroundImage: `linear-gradient(135deg, ${varAlpha(
          theme.vars.palette[accent].mainChannel,
          0.14
        )} 0%, ${varAlpha(theme.vars.palette[accent].mainChannel, 0.02)} 60%)`,
      })}
    >
      <Iconify
        icon="solar:bell-bing-bold-duotone"
        width={180}
        sx={{
          position: 'absolute',
          right: -24,
          top: -24,
          opacity: 0.08,
          color: `${accent}.main`,
          display: { xs: 'none', md: 'block' },
          pointerEvents: 'none',
        }}
      />

      <Stack spacing={2} sx={{ position: 'relative' }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Stack
            direction="row"
            alignItems="center"
            flexWrap="wrap"
            sx={{ gap: 0.75, flexGrow: 1 }}
          >
            <Label
              variant="filled"
              color={accent}
              startIcon={
                <Iconify icon={a.pinned ? 'eva:star-fill' : 'solar:bell-bing-bold'} width={14} />
              }
            >
              {a.pinned ? 'Pinned' : 'Latest'}
            </Label>
            <AudienceChip a={a} />
            {a.isExpired && (
              <Label variant="soft" color="default">
                Expired
              </Label>
            )}
          </Stack>
          {canManage && <ManageActions a={a} />}
        </Stack>

        <Typography variant="h4" sx={{ wordBreak: 'break-word', maxWidth: 820 }}>
          {a.title}
        </Typography>

        <Box sx={{ maxWidth: 820 }}>
          <ExpandableBody body={a.body} lines={5} threshold={420} variant="body1" />
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
        >
          <PosterLine a={a} accent={accent} />
          {a.expiresOn && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Shown until {fDate(a.expiresOn)}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

/** Loading state: a hero placeholder and a grid of card placeholders. */
export function AnnouncementsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <Stack spacing={3}>
      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={72} height={24} />
            <Skeleton variant="rounded" width={88} height={24} />
          </Stack>
          <Skeleton variant="text" sx={{ typography: 'h4', width: '60%' }} />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width={160} />
          </Stack>
        </Stack>
      </Card>
      <Grid container spacing={3}>
        {Array.from({ length: cards }, (_, index) => (
          <Grid key={index} size={{ xs: 12, md: 6 }}>
            <Card sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Skeleton variant="rounded" width={88} height={24} />
                <Skeleton variant="text" sx={{ typography: 'h6', width: '70%' }} />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="85%" />
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={120} />
                </Stack>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type DialogProps = {
  open: boolean;
  onClose: () => void;
  current?: AnnouncementDto;
};

const TITLE_MAX = 200;
const BODY_MAX = 10000;

/** Post a new announcement, or edit one (the poster or an Admin) — with a live preview. */
export function AnnouncementDialog({ open, onClose, current }: DialogProps) {
  const { user } = useAuthContext();
  const { departments } = useGetDepartments();
  const [title, setTitle] = useState(current?.title ?? '');
  const [body, setBody] = useState(current?.body ?? '');
  const [audience, setAudience] = useState<AnnouncementAudience>(current?.audience ?? 'ALL');
  const [departmentIds, setDepartmentIds] = useState<number[]>(current?.departmentIds ?? []);
  const [pinned, setPinned] = useState(current?.pinned ?? false);
  const [expiresOn, setExpiresOn] = useState(current?.expiresOn ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const titleError = submitted && !title.trim();
  const bodyError = submitted && !body.trim();
  const departmentError = submitted && audience === 'DEPARTMENT' && !departmentIds.length;

  const onSave = async () => {
    setSubmitted(true);
    if (!title.trim() || !body.trim()) {
      toast.error('Give the announcement a title and a message');
      return;
    }
    if (audience === 'DEPARTMENT' && !departmentIds.length) {
      toast.error('Choose at least one department');
      return;
    }
    const payload = {
      title,
      body,
      audience,
      departmentIds: audience === 'DEPARTMENT' ? departmentIds : [],
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

  const now = new Date().toISOString();
  const posterName =
    current?.posterName ??
    (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null : null);
  const preview: AnnouncementDto = {
    id: current?.id ?? 0,
    title: title.trim(),
    body: body.trim(),
    postedBy: current?.postedBy ?? null,
    posterName,
    posterRole: current?.posterRole ?? user?.role ?? null,
    audience,
    departmentIds,
    departmentNames: departments
      .filter((department) => departmentIds.includes(department.id))
      .map((department) => department.name),
    pinned,
    expiresOn: expiresOn || null,
    isExpired: false,
    createdAt: current?.createdAt ?? now,
    updatedAt: current?.createdAt ?? now,
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle>{current ? 'Edit announcement' : 'Post announcement'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
                error={titleError}
                helperText={titleError ? 'Add a title' : `${title.length}/${TITLE_MAX}`}
                fullWidth
              />
              <TextField
                label="Message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                multiline
                minRows={6}
                slotProps={{ htmlInput: { maxLength: BODY_MAX } }}
                error={bodyError}
                helperText={bodyError ? 'Write the message' : `${body.length}/${BODY_MAX}`}
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
                  <MenuItem value="DEPARTMENT">Selected departments</MenuItem>
                </TextField>
                {audience === 'DEPARTMENT' && (
                  <TextField
                    select
                    label="Departments"
                    value={departmentIds}
                    onChange={(event) => {
                      const value = event.target.value as unknown as number[] | string;
                      setDepartmentIds(
                        (typeof value === 'string' ? value.split(',') : value).map(Number)
                      );
                    }}
                    error={departmentError}
                    helperText={
                      departmentError ? 'Choose at least one department' : 'Pick one or more'
                    }
                    slotProps={{
                      select: {
                        multiple: true,
                        renderValue: (selected) =>
                          departments
                            .filter((department) => (selected as number[]).includes(department.id))
                            .map((department) => department.name)
                            .join(', '),
                      },
                    }}
                    fullWidth
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.id}>
                        <Checkbox
                          size="small"
                          checked={departmentIds.includes(department.id)}
                          sx={{ p: 0, mr: 1 }}
                        />
                        {department.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
              >
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
                  control={
                    <Switch
                      checked={pinned}
                      onChange={(event) => setPinned(event.target.checked)}
                    />
                  }
                  label="Pin to top"
                  sx={{ flexShrink: 0 }}
                />
              </Stack>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                p: 2,
                height: 1,
                borderRadius: 2,
                bgcolor: 'background.neutral',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:eye-bold" width={18} sx={{ color: 'text.secondary' }} />
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  Live preview
                </Typography>
              </Stack>
              <AnnouncementCard announcement={preview} preview sx={{ height: 'auto' }} />
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {audience === 'DEPARTMENT'
                  ? 'Only people in the chosen departments will see it and be notified.'
                  : 'Everyone at BNW will see it and be notified.'}
                {pinned ? ' Pinned posts stay at the top of the board.' : ''}
              </Typography>
            </Box>
          </Grid>
        </Grid>
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
