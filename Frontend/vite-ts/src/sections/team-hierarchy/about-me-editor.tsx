import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { updateMyAboutMe, countAboutMeWords, ABOUT_ME_MAX_WORDS } from 'src/actions/users';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type Props = {
  value: string | null;
  /** Called with the saved text (e.g. to refresh the signed-in user). */
  onSaved?: (aboutMe: string | null) => void | Promise<void>;
};

/**
 * Your own "About me" — a few lines shown on your Team Hierarchy side panel. Limited to
 * ABOUT_ME_MAX_WORDS words (the backend checks the same limit).
 */
export function AboutMeEditor({ value, onSaved }: Props) {
  const [text, setText] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const words = countAboutMeWords(text);
  const tooLong = words > ABOUT_ME_MAX_WORDS;
  const changed = text.trim() !== (value ?? '').trim();

  const onSave = async () => {
    if (tooLong) {
      toast.error(`Keep it to ${ABOUT_ME_MAX_WORDS} words or fewer`);
      return;
    }
    setSaving(true);
    try {
      const saved = await updateMyAboutMe(text.trim() || null);
      await onSaved?.(saved.aboutMe ?? null);
      toast.success(text.trim() ? '"About me" saved' : '"About me" removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1}>
      <TextField
        multiline
        minRows={3}
        label="About me"
        placeholder="A few lines about yourself — your work, interests, what colleagues can come to you for."
        value={text}
        onChange={(event) => setText(event.target.value)}
        error={tooLong}
        helperText={`${words}/${ABOUT_ME_MAX_WORDS} words`}
        slotProps={{ htmlInput: { maxLength: 400 } }}
        fullWidth
      />
      {changed && (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" color="inherit" onClick={() => setText(value ?? '')}>
            Undo
          </Button>
          <Button
            size="small"
            variant="contained"
            loading={saving}
            disabled={tooLong}
            onClick={onSave}
          >
            Save
          </Button>
        </Stack>
      )}
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        Everyone sees this when they open your card on Team Hierarchy.
      </Typography>
    </Stack>
  );
}
