import type { IHierarchyNode } from 'src/types/user';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { avatarSrc, AVATAR_ACCEPT, uploadUserAvatar, removeUserAvatar } from 'src/actions/users';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { companyLabel, userRoleLabel, employmentTypeLabel } from 'src/types/user';

import { AboutMeEditor } from './about-me-editor';

// ----------------------------------------------------------------------

type Props = {
  person: IHierarchyNode | null;
  manager: IHierarchyNode | null;
  reports: IHierarchyNode[];
  /** The signed-in user. */
  currentUserId?: number;
  currentRole: string;
  onClose: () => void;
  /** Jump to another person (manager / direct report) on the chart. */
  onSelectPerson: (id: number) => void;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ typography: 'body2' }}>
      <Box component="span" sx={{ width: 120, flexShrink: 0, color: 'text.secondary' }}>
        {label}
      </Box>
      <Box component="span" sx={{ minWidth: 0, wordBreak: 'break-word' }}>
        {value || '—'}
      </Box>
    </Stack>
  );
}

/**
 * Basic profile of someone on the Team Hierarchy chart. Links follow the backend's rules: the full
 * user page is HR / ADMIN / the person themself / their manager; the E-record also allows CEO.
 */
export function HierarchyProfileDrawer({
  person,
  manager,
  reports,
  currentUserId,
  currentRole,
  onClose,
  onSelectPerson,
}: Props) {
  const isSelf = !!person && person.id === currentUserId;
  const isTheirManager = !!person && !!currentUserId && person.managerId === currentUserId;
  const isHrOrAdmin = currentRole === 'HR' || currentRole === 'ADMIN';
  const canViewProfile = isHrOrAdmin || isSelf || isTheirManager;
  const canViewRecord = canViewProfile || currentRole === 'CEO';

  // HR / Admin put photos on anyone's card; everyone else changes their own on the Account page.
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const handlePhoto = async (file: File | undefined) => {
    if (!person || !file) return;
    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      toast.error('Choose a JPG, PNG or WEBP image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('The image must be 2MB or smaller');
      return;
    }
    setPhotoBusy(true);
    try {
      await uploadUserAvatar(person.id, file);
      toast.success(`Photo updated for ${person.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setPhotoBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!person) return;
    setPhotoBusy(true);
    try {
      await removeUserAvatar(person.id);
      toast.success('Photo removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={!!person}
      onClose={onClose}
      slotProps={{ backdrop: { invisible: true }, paper: { sx: { width: { xs: 1, sm: 360 } } } }}
    >
      {person && (
        <>
          <Box sx={{ py: 2, pr: 1, pl: 2.5, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Profile
            </Typography>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Box>

          <Divider />

          <Scrollbar>
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Avatar
                alt={person.name}
                src={avatarSrc(person.avatarUrl)}
                sx={{ width: 96, height: 96, mx: 'auto', mb: 2, fontSize: 32 }}
              >
                {person.name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6">{person.name}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {person.designation || '—'}
              </Typography>
              {(isHrOrAdmin || isSelf) && (
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                  {isHrOrAdmin ? (
                    <>
                      <input
                        ref={fileInput}
                        hidden
                        type="file"
                        accept={AVATAR_ACCEPT}
                        onChange={(e) => handlePhoto(e.target.files?.[0])}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        loading={photoBusy}
                        onClick={() => fileInput.current?.click()}
                        startIcon={<Iconify icon="solar:camera-add-bold" />}
                      >
                        {person.avatarUrl ? 'Change photo' : 'Upload photo'}
                      </Button>
                      {person.avatarUrl && (
                        <Button
                          size="small"
                          color="error"
                          disabled={photoBusy}
                          onClick={handleRemovePhoto}
                        >
                          Remove
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      href={paths.dashboard.user.account}
                      startIcon={<Iconify icon="solar:camera-add-bold" />}
                    >
                      Change my photo
                    </Button>
                  )}
                </Stack>
              )}
              <Stack direction="row" spacing={1} justifyContent="center">
                <Label variant="soft" color="default">
                  {userRoleLabel(person.role)}
                </Label>
                <Label
                  variant="soft"
                  color={person.employmentType === 'INTERN' ? 'info' : 'default'}
                >
                  {employmentTypeLabel(person.employmentType)}
                </Label>
              </Stack>
            </Box>

            <Box sx={{ px: 3, pb: 2.5 }}>
              {isSelf ? (
                <AboutMeEditor key={person.id} value={person.aboutMe} />
              ) : (
                <>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                    About me
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-line',
                      color: person.aboutMe ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {person.aboutMe || `${person.name.split(' ')[0]} hasn't written anything yet.`}
                  </Typography>
                </>
              )}
            </Box>

            <Stack spacing={1.5} sx={{ px: 3, pb: 3 }}>
              <InfoRow label="Company" value={companyLabel(person.company)} />
              <InfoRow label="Department" value={person.departmentName} />
              <InfoRow
                label="Reports to"
                value={
                  manager && (
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onSelectPerson(manager.id)}
                      sx={{
                        p: 0,
                        border: 0,
                        font: 'inherit',
                        color: 'primary.main',
                        cursor: 'pointer',
                        bgcolor: 'transparent',
                        textAlign: 'left',
                      }}
                    >
                      {manager.name}
                    </Box>
                  )
                }
              />
              <InfoRow label="Direct reports" value={reports.length || null} />
            </Stack>

            {(canViewProfile || canViewRecord) && (
              <Stack direction="row" spacing={1} sx={{ px: 3, pb: 3 }}>
                {canViewProfile && (
                  <Button
                    fullWidth
                    variant="contained"
                    component={RouterLink}
                    href={paths.dashboard.user.details(person.id)}
                    startIcon={<Iconify icon="solar:user-id-bold" />}
                  >
                    View profile
                  </Button>
                )}
                {canViewRecord && (
                  <Button
                    fullWidth
                    variant="outlined"
                    component={RouterLink}
                    href={paths.dashboard.employees.record(person.id)}
                    startIcon={<Iconify icon="solar:file-text-bold" />}
                  >
                    E-record
                  </Button>
                )}
              </Stack>
            )}

            {!!reports.length && (
              <>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Typography variant="subtitle2" sx={{ px: 3, pt: 2 }}>
                  Direct reports
                </Typography>
                <List disablePadding sx={{ px: 1.5, py: 1 }}>
                  {reports.map((report) => (
                    <ListItemButton
                      key={report.id}
                      onClick={() => onSelectPerson(report.id)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemAvatar>
                        <Avatar alt={report.name} src={avatarSrc(report.avatarUrl)}>
                          {report.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={report.name}
                        secondary={report.designation || userRoleLabel(report.role)}
                        slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}
          </Scrollbar>
        </>
      )}
    </Drawer>
  );
}
