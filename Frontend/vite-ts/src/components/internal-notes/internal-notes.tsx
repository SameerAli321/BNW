import type { TextFieldProps } from '@mui/material/TextField';
import type { NoteEntity } from 'src/actions/internal-notes';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { saveInternalNote, useGetInternalNotes } from 'src/actions/internal-notes';

import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------
// "Notes for HR" (client decision, Nov 2026). The box goes on every create form; whatever is
// written is saved with the new record and only HR / Admin can read it.

export const NOTES_FOR_HR_MAX = 2000;

type FieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

/** The free-text box. Kept outside each form's own schema — the form saves it after creating. */
export function NotesForHrField({ value, onChange, ...other }: FieldProps) {
  return (
    <TextField
      fullWidth
      multiline
      minRows={2}
      label="Notes for HR (optional)"
      placeholder="Anything you'd like HR to know"
      helperText="Only HR and Admin can see this."
      value={value}
      onChange={(event) => onChange(event.target.value.slice(0, NOTES_FOR_HR_MAX))}
      {...other}
    />
  );
}

/**
 * Saves the note for a record that was just created. Never throws — the record is already saved,
 * so a failed note is only a warning.
 */
export async function saveNoteForHr(
  entity: NoteEntity,
  entityId: number | string | undefined | null,
  note: string
): Promise<void> {
  try {
    await saveInternalNote(entity, entityId, note);
  } catch (error) {
    console.error(error);
    toast.warning('Saved, but your note for HR could not be added');
  }
}

// ----------------------------------------------------------------------

type CardProps = {
  entity: NoteEntity;
  entityId: number | string;
};

/** HR / Admin only: the notes written on this record. Renders nothing for anyone else or when empty. */
export function InternalNotesCard({ entity, entityId }: CardProps) {
  const { user } = useAuthContext();
  const canSee = user?.role === 'HR' || user?.role === 'ADMIN';
  const { notes } = useGetInternalNotes({ entity, entityId: Number(entityId), limit: 50 }, canSee);

  if (!canSee || !notes.length) return null;

  return (
    <Card>
      <CardHeader title="Notes for HR" subheader="Only HR and Admin can see these." />
      <Stack spacing={2} sx={{ p: 3 }}>
        {notes.map((note) => (
          <Stack key={note.id} spacing={0.5}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {note.note}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {note.createdByName ?? 'Unknown'} · {fDateTime(note.createdAt)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
