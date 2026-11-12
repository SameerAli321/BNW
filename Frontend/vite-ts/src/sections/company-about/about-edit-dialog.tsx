import type { AboutDto, AboutStory } from 'src/actions/about';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { avatarSrc } from 'src/actions/users';
import { updateAbout, uploadCeoPhoto, removeCeoPhoto } from 'src/actions/about';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { StoryTextField, StoryItemsField } from './about-story-fields';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'company', label: 'Company & contacts' },
  { value: 'story', label: 'Welcome & story' },
  { value: 'services', label: 'What we do' },
  { value: 'group', label: 'Sister firm' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'people', label: 'People & culture' },
  { value: 'journey', label: 'Journey & your role' },
  { value: 'ceo', label: "CEO's message" },
] as const;

export type AboutEditTab = (typeof TABS)[number]['value'];

type Props = {
  about: AboutDto;
  open: boolean;
  onClose: () => void;
  /** Which tab opens first — "What is BNW" opens on the company, "CEO's Message" on the CEO. */
  initialTab?: AboutEditTab;
};

const lines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Edit About us (CEO / HR / ADMIN), one tab per part of the pages: company details and contacts,
 * the "What is BNW" story (welcome, who we are, vision, mission, services, sister firm, principles,
 * culture, expectations, commitment, journey, your role) and the CEO's message. Everything is saved
 * together with "Save"; the CEO's photo uploads straight away (JPG, PNG or WEBP up to 2 MB).
 */
export function AboutEditDialog({ about, open, onClose, initialTab = 'company' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<AboutEditTab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    ...about.company,
    phonesText: about.company.phones.join('\n'),
    ceoName: about.ceo.name,
    ceoTitle: about.ceo.title,
    ceoQuote: about.ceo.quote ?? '',
    ceoMessage: about.ceo.message,
  }));
  const [story, setStory] = useState<AboutStory>(() => about.story);
  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const setStoryField = <K extends keyof AboutStory>(key: K, value: AboutStory[K]) =>
    setStory((prev) => ({ ...prev, [key]: value }));
  /** Props for a long story text field. */
  const text = (key: keyof AboutStory, label: string, rows = 4) => ({
    label,
    rows,
    value: story[key] as string,
    onChange: (value: string) => setStoryField(key, value),
  });

  const onSave = async () => {
    if (!form.name.trim()) {
      setTab('company');
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
          services: form.services,
          address: form.address,
          phones: lines(form.phonesText),
          email: form.email,
          website: form.website,
        },
        ceo: {
          name: form.ceoName,
          title: form.ceoTitle,
          quote: form.ceoQuote,
          message: form.ceoMessage,
        },
        story,
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

  const twoColumns = { gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 0 }}>Edit About us</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, value: AboutEditTab) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ px: 3, borderBottom: (theme) => `1px solid ${theme.vars.palette.divider}` }}
      >
        {TABS.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} />
        ))}
      </Tabs>

      <DialogContent sx={{ minHeight: 420 }}>
        <Stack spacing={2.5} sx={{ pt: 2.5 }}>
          {tab === 'company' && (
            <>
              <Box sx={twoColumns}>
                <TextField
                  label="Company name"
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
                <TextField
                  label="Tagline"
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)}
                />
              </Box>
              <TextField
                label="Office address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
              <Box
                sx={{
                  gap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                }}
              >
                <TextField
                  label="Phone numbers — one per line"
                  multiline
                  minRows={2}
                  value={form.phonesText}
                  onChange={(e) => set('phonesText', e.target.value)}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
                <TextField
                  label="Website"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                />
              </Box>
            </>
          )}

          {tab === 'story' && (
            <>
              <Box sx={twoColumns}>
                <StoryTextField {...text('welcomeTitle', 'Welcome heading', 1)} />
                <StoryTextField {...text('welcomeSubtitle', 'Welcome subheading', 1)} />
              </Box>
              <StoryTextField {...text('whoWeAre', 'Who We Are', 8)} />
              <StoryTextField {...text('vision', 'Our Vision')} />
              <StoryTextField {...text('mission', 'Our Mission')} />
            </>
          )}

          {tab === 'services' && (
            <>
              <StoryTextField {...text('servicesIntro', 'Introduction', 2)} />
              <StoryItemsField
                label="Services"
                itemLabel="Service"
                items={story.services}
                onChange={(items) => setStoryField('services', items)}
                textRows={2}
              />
              <StoryTextField {...text('servicesOutro', 'Closing line', 2)} />
            </>
          )}

          {tab === 'group' && (
            <>
              <StoryTextField {...text('groupIntro', 'Introduction', 2)} />
              <StoryItemsField
                label="Firms"
                itemLabel="Firm"
                items={story.firms}
                onChange={(items) => setStoryField('firms', items)}
                max={6}
              />
              <StoryTextField
                {...text('groupMotto', 'Motto (shown large)', 1)}
                helperText="One short line shown in a banner, e.g. Independence in responsibility, strength through collaboration."
              />
              <StoryTextField {...text('groupText', 'More about the group', 6)} />
            </>
          )}

          {tab === 'philosophy' && (
            <>
              <StoryTextField {...text('philosophyIntro', 'Introduction')} />
              <StoryItemsField
                label="Principles (numbered on the page in this order)"
                itemLabel="Principle"
                items={story.principles}
                onChange={(items) => setStoryField('principles', items)}
              />
            </>
          )}

          {tab === 'people' && (
            <>
              <StoryTextField {...text('culture', 'Our People, Our Culture', 6)} />
              <StoryTextField {...text('expectationsIntro', 'Expectations — introduction', 2)} />
              <StoryItemsField
                label="What we expect from every team member"
                itemLabel="Expectation"
                items={story.expectations}
                onChange={(items) => setStoryField('expectations', items)}
                textRows={1}
              />
              <StoryTextField {...text('expectationsOutro', 'Expectations — closing', 2)} />
              <StoryTextField {...text('commitment', 'Our Commitment to Our People', 5)} />
            </>
          )}

          {tab === 'journey' && (
            <>
              <StoryTextField {...text('journeyIntro', 'Introduction', 2)} />
              <StoryItemsField
                label="Timeline (oldest first)"
                itemLabel="Milestone"
                items={story.milestones}
                onChange={(items) => setStoryField('milestones', items)}
                withDate
              />
              <StoryTextField {...text('journeyOutro', 'The road ahead')} />
              <StoryTextField
                {...text('yourRole', 'Your Role in Our Story', 6)}
                helperText="Leave a blank line between paragraphs. The last paragraph is shown large as the closing line."
              />
            </>
          )}

          {tab === 'ceo' && (
            <>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2.5}
                alignItems={{ sm: 'center' }}
              >
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
                      <Button
                        size="small"
                        color="error"
                        disabled={photoBusy}
                        onClick={onRemovePhoto}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    JPG, PNG or WEBP, up to 2 MB. Saved immediately. A portrait (head and shoulders,
                    plain background) looks best.
                    {!about.ceo.hasCustomPhoto &&
                      " Until one is uploaded, the CEO's profile picture is used."}
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

              <Box sx={twoColumns}>
                <TextField
                  label="CEO name"
                  value={form.ceoName}
                  onChange={(e) => set('ceoName', e.target.value)}
                  placeholder={about.ceo.name}
                  helperText="Leave empty to use the name on the CEO's account"
                />
                <TextField
                  label="Title"
                  value={form.ceoTitle}
                  onChange={(e) => set('ceoTitle', e.target.value)}
                />
              </Box>
              <TextField
                label="Headline quote (optional)"
                value={form.ceoQuote}
                onChange={(e) => set('ceoQuote', e.target.value)}
                placeholder="e.g. Success is shaped by the people behind it."
                helperText="A short line in the CEO's own words (not the job title), shown large beside the photo. Leave empty to show the CEO's name there instead."
                slotProps={{ htmlInput: { maxLength: 160 } }}
              />
              <TextField
                label="Message"
                multiline
                minRows={8}
                value={form.ceoMessage}
                onChange={(e) => set('ceoMessage', e.target.value)}
                placeholder="A welcome message from the CEO to everyone at BNW…"
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 'auto', pl: 1 }}>
          Changes on every tab are saved together.
        </Typography>
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
