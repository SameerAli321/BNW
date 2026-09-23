import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useGetUsers } from 'src/actions/users';
import { DashboardContent } from 'src/layouts/dashboard';
import { createLetter, useGetLetterTemplates, useGetLetterTemplateFields } from 'src/actions/letters';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { LetterManualFields } from '../letter-manual-fields';

// ----------------------------------------------------------------------

/**
 * Create-letter flow — HR/ADMIN pick a template + an employee, fill the template's manual fields
 * (`fieldsSchema` entries where `autoFilled === false`), submit -> `DRAFT` letter, navigate to its
 * detail page. See docs/API_CONTRACT_SPRINT3.md, `POST /letters` + `GET /letter-templates/:id/fields`.
 */
export function LetterCreateView() {
  const router = useRouter();
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  const [templateId, setTemplateId] = useState<number | ''>('');
  const [subjectUserId, setSubjectUserId] = useState<number | ''>('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { templates } = useGetLetterTemplates({ isActive: true });
  const { users } = useGetUsers({ limit: 200 });
  const { fieldsSchema } = useGetLetterTemplateFields(templateId || undefined);

  const autoFilledFields = useMemo(() => fieldsSchema.filter((f) => f.autoFilled), [fieldsSchema]);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleTemplateChange = (value: number | '') => {
    setTemplateId(value);
    setFieldValues({});
  };

  const onSubmit = async () => {
    if (templateId === '' || subjectUserId === '') {
      toast.error('Template and employee are required!');
      return;
    }

    setSubmitting(true);
    try {
      const letter = await createLetter({ templateId, subjectUserId, fieldValues });
      toast.success('Draft letter created!');
      router.push(paths.dashboard.letters.details(letter.id));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Create failed!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleBasedGuard hasContent currentRole={currentRole} allowedRoles={['HR', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="New letter"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Letters', href: paths.dashboard.letters.root },
            { name: 'New' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ p: 3 }}>
              <Box
                sx={{
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <TextField
                  select
                  label="Template"
                  value={templateId}
                  onChange={(event) =>
                    handleTemplateChange(event.target.value === '' ? '' : Number(event.target.value))
                  }
                >
                  <MenuItem value="">
                    <em>Select a template</em>
                  </MenuItem>
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} ({template.type})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Employee"
                  value={subjectUserId}
                  onChange={(event) =>
                    setSubjectUserId(event.target.value === '' ? '' : Number(event.target.value))
                  }
                >
                  <MenuItem value="">
                    <em>Select an employee</em>
                  </MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {!!templateId && (
                <Stack sx={{ mt: 3 }} spacing={3}>
                  {!!autoFilledFields.length && (
                    <Alert severity="info">
                      Auto-filled from the employee record at render time:{' '}
                      {autoFilledFields.map((f) => f.label).join(', ')}. Only the fields below need
                      to be filled in manually.
                    </Alert>
                  )}

                  <LetterManualFields
                    fields={fieldsSchema}
                    values={fieldValues}
                    onChange={handleFieldChange}
                  />
                </Stack>
              )}

              <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
                <Button variant="contained" loading={submitting} onClick={onSubmit}>
                  Create draft
                </Button>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </DashboardContent>
    </RoleBasedGuard>
  );
}
