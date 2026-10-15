import type { AboutDto } from 'src/actions/about';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { avatarSrc } from 'src/actions/users';
import { updateAbout, uploadCeoPhoto, removeCeoPhoto } from 'src/actions/about';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = { about: AboutDto; open: boolean; onClose: () => void };

const lines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Edit About us (CEO / HR / ADMIN): company details, then the CEO's message. The photo uploads
 * straight away (JPG, PNG or WEBP up to 2 MB); the text is saved with "Save".
 */
export function AboutEditDialog({ about, open, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    ...about.company,
    servicesText: about.company.services.join('\n'),
    phonesText: about.company.phones.join('\n'),
    ceoName: about.ceo.name,
    ceoTitle: about.ceo.title,
    ceoMessage: about.ceo.message,
  }));
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSave = async () => {
    if (!form.name.trim()) {
      toast.error('Enter the company name');
      return;
    }
    setSaving(true);
    try {
      await updateAbout({
        company: {
          name: form.name,
          tagline: form.tagline,
          about: form.about,
          mission: form.mission,
          vision: form.vision,
          services: lines(form.servicesText),
          address: form.address,
          phones: lines(form.phonesText),
          email: form.email,
          website: form.website,
        },
        ceo: { name: form.ceoName, title: form.ceoTitle, message: form.ceoMessage },
      });
      toast.success('About us updated');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('The photo must be 2 MB or smaller');
      return;
    }
    setPhotoBusy(true);
    try {
      await uploadCeoPhoto(file);
      toast.success('Photo updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the photo');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemovePhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeCeoPhoto();
      toast.success("Photo removed — the CEO's profile picture is shown instead");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>Edit About us</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Company details
          </Typography>
          <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Company name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
            <TextField label="Tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
          </Box>
          <TextField label="Who we are" multiline minRows={4} value={form.about} onChange={(e) => set('about', e.target.value)} />
          <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Mission (optional)" multiline minRows={2} value={form.mission} onChange={(e) => set('mission', e.target.value)} />
            <TextField label="Vision (optional)" multiline minRows={2} value={form.vision} onChange={(e) => set('vision', e.target.value)} />
          </Box>
          <TextField
            label="What we do — one service per line"
            multiline
            minRows={4}
            value={form.servicesText}
            onChange={(e) => set('servicesText', e.target.value)}
          />
          <TextField label="Office address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
            <TextField
              label="Phone numbers — one per line"
              multiline
              minRows={2}
              value={form.phonesText}
              onChange={(e) => set('phonesText', e.target.value)}
            />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <TextField label="Website" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </Box>

          <Divider sx={{ borderStyle: 'dashed' }} />
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            CEO&apos;s message
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
            <Avatar
              src={avatarSrc(about.ceo.photoUrl)}
              alt={about.ceo.name}
              variant="rounded"
              sx={{ width: 96, height: 96, fontSize: 32 }}
            >
              {about.ceo.name?.[0] ?? 'C'}
            </Avatar>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  loading={photoBusy}
                  startIcon={<Iconify icon="solar:camera-add-bold" />}
                  onClick={() => fileRef.current?.click()}
                >
                  {about.ceo.photoUrl ? 'Change photo' : 'Upload photo'}
                </Button>
                {about.ceo.hasCustomPhoto && (
                  <Button size="small" color="error" disabled={photoBusy} onClick={onRemovePhoto}>
                    Remove
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                JPG, PNG or WEBP, up to 2 MB. Saved immediately.
                {!about.ceo.hasCustomPhoto && " Until one is uploaded, the CEO's profile picture is used."}
              </Typography>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </Stack>
          </Stack>

          <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              label="CEO name"
              value={form.ceoName}
              onChange={(e) => set('ceoName', e.target.value)}
              placeholder={about.ceo.name}
              helperText="Leave empty to use the name on the CEO's account"
            />
            <TextField label="Title" value={form.ceoTitle} onChange={(e) => set('ceoTitle', e.target.value)} />
          </Box>
          <TextField
            label="Message"
            multiline
            minRows={8}
            value={form.ceoMessage}
            onChange={(e) => set('ceoMessage', e.target.value)}
            placeholder="A welcome message from the CEO to everyone at BNW…"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" loading={saving} onClick={onSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
