import type { LetterTemplateDto } from 'src/types/letter';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { createLetterTemplate, updateLetterTemplate } from 'src/actions/letters';

import { toast } from 'src/components/snackbar';

import { LETTER_TYPE_OPTIONS } from 'src/types/letter';

import { LetterTemplateFieldsEditor } from './letter-template-fields-editor';

// ----------------------------------------------------------------------

type Props = {
  currentTemplate?: LetterTemplateDto;
  // The list DTO omits `bodyHtml` (see the contract's DTO comment) — a fresh template starts with
  // clearly-marked placeholder copy, matching the seeded templates' pattern.
  currentBodyHtml?: string;
};

const DEFAULT_BODY_HTML =
  '<p><em>[PLACEHOLDER TEMPLATE — replace with real letter content]</em></p>';

export function LetterTemplateNewEditForm({ currentTemplate, currentBodyHtml }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(currentTemplate?.name ?? '');
  const [type, setType] = useState(currentTemplate?.type ?? 'OFFER');
  const [roleScope, setRoleScope] = useState(currentTemplate?.roleScope ?? '');
  const [isActive, setIsActive] = useState(currentTemplate?.isActive ?? true);
  const [bodyHtml, setBodyHtml] = useState(currentBodyHtml ?? DEFAULT_BODY_HTML);
  // We never actually have the real stored bodyHtml on edit (the list/detail API omits it — see
  // the Alert below), so only send it on save if the user explicitly typed something here.
  // Otherwise PUT would silently blank out real content once real templates replace the
  // placeholders. The backend's partial-update (`if (dto.bodyHtml !== undefined) ...`) preserves
  // whatever's already stored when this field is left out of the payload.
  const [bodyHtmlTouched, setBodyHtmlTouched] = useState(false);
  const [fieldsSchema, setFieldsSchema] = useState(currentTemplate?.fieldsSchema ?? []);

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required!');
      return;
    }
    if (fieldsSchema.some((f) => !f.key.trim() || !f.label.trim())) {
      toast.error('Every field needs a key and a label!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        type,
        roleScope: roleScope || null,
        fieldsSchema,
        isActive,
      };

      if (currentTemplate) {
        await updateLetterTemplate(currentTemplate.id, {
          ...payload,
          // Only include bodyHtml if the user actually edited it this session — see the note by
          // `bodyHtmlTouched` above.
          ...(bodyHtmlTouched ? { bodyHtml } : {}),
          version: currentTemplate.version,
        });
        toast.success('Template updated!');
      } else {
        // New template: always send bodyHtml (defaults to the placeholder copy if untouched).
        await createLetterTemplate({ ...payload, bodyHtml });
        toast.success('Template created!');
      }
      router.push(paths.dashboard.letterTemplates.root);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Save failed!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Card sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Templates are placeholder content this sprint — pick a type/name and define the
            fields HR fills in, no rich body editor needed yet.
          </Typography>

          {currentTemplate && (
            <Alert severity="info" sx={{ mb: 3 }}>
              The template list/detail API intentionally omits <code>bodyHtml</code> (it&apos;s
              template source, not needed by the letter-creation or detail UI — see
              docs/API_CONTRACT_SPRINT3.md), so this form can&apos;t show you the current stored
              body. The field below is left as placeholder text and is only saved if you actually
              type something in it — leaving it alone keeps whatever&apos;s already stored.
            </Alert>
          )}

          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Type"
                value={type}
                onChange={(event) => setType(event.target.value as LetterTemplateDto['type'])}
                fullWidth
              >
                {LETTER_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Role scope (informational only, not enforced)"
                placeholder="e.g. All, or a specific role"
                value={roleScope}
                onChange={(event) => setRoleScope(event.target.value)}
                fullWidth
              />
              <FormControlLabel
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                control={
                  <Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                }
                label="Active"
              />
            </Stack>

            <TextField
              label="Body (placeholder text — {{placeholder}} syntax)"
              value={bodyHtml}
              onChange={(event) => {
                setBodyHtml(event.target.value);
                setBodyHtmlTouched(true);
              }}
              multiline
              rows={4}
              fullWidth
            />

            <LetterTemplateFieldsEditor fields={fieldsSchema} onChange={setFieldsSchema} />
          </Stack>

          <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
            <Button variant="contained" loading={submitting} onClick={onSubmit}>
              {currentTemplate ? 'Save changes' : 'Create template'}
            </Button>
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );
}
