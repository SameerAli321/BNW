import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useGetUsers } from 'src/actions/users';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetCandidates } from 'src/actions/candidates';
import { createLetter, useGetLetterTemplates, useGetLetterTemplateFields } from 'src/actions/letters';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { LetterManualFields } from '../letter-manual-fields';

// ----------------------------------------------------------------------

/**
 * Create-letter flow — HR/ADMIN pick a template + an employee (or a hiring candidate), fill the template's manual fields
 * (`fieldsSchema` entries where `autoFilled === false`), submit -> `DRAFT` letter, navigate to its
 * detail page. See docs/API_CONTRACT_SPRINT3.md, `POST /letters` + `GET /letter-templates/:id/fields`.
 */
export function LetterCreateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';

  // Optional prefill from a query string, e.g. `?subjectUserId=27&letterType=APPRECIATION` — used
  // by the Appraisal detail page to jump straight here with the employee + the right
  // appreciation/rejection template pre-selected once a CEO decision is final.
  // `?candidateId=12` comes from Hiring's "Prepare letter / contract" — a candidate with no
  // account yet; the letter moves onto their account when Admin converts them.
  const prefillSubjectUserId = searchParams.get('subjectUserId');
  const prefillCandidateId = searchParams.get('candidateId');
  const prefillLetterType = searchParams.get('letterType');

  const [subjectKind, setSubjectKind] = useState<'EMPLOYEE' | 'CANDIDATE'>(
    prefillCandidateId && !prefillSubjectUserId ? 'CANDIDATE' : 'EMPLOYEE'
  );
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [subjectUserId, setSubjectUserId] = useState<number | ''>(
    prefillSubjectUserId ? Number(prefillSubjectUserId) : ''
  );
  const [subjectCandidateId, setSubjectCandidateId] = useState<number | ''>(
    prefillCandidateId ? Number(prefillCandidateId) : ''
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { templates } = useGetLetterTemplates({ isActive: true });
  const { users } = useGetUsers({ limit: 200 });
  const { candidates } = useGetCandidates({ limit: 200 });
  const { fieldsSchema } = useGetLetterTemplateFields(templateId || undefined);

  // HIRED candidates already have an account — their letters go to the employee instead.
  const openCandidates = useMemo(
    () => candidates.filter((c) => c.status !== 'HIRED'),
    [candidates]
  );
  const isCandidate = subjectKind === 'CANDIDATE';

  useEffect(() => {
    if (!prefillLetterType || templateId !== '' || !templates.length) return;
    const match = templates.find((t) => t.type === prefillLetterType);
    if (match) setTemplateId(match.id);
  }, [prefillLetterType, templateId, templates]);

  // Pre-fill manual fields that have a default (e.g. the contract's job description) once the
  // template's fields load; anything HR has already typed is kept.
  useEffect(() => {
    setFieldValues((prev) => {
      const defaults = fieldsSchema.filter(
        (f) => !f.autoFilled && f.defaultValue && prev[f.key] === undefined
      );
      if (!defaults.length) return prev;
      return { ...prev, ...Object.fromEntries(defaults.map((f) => [f.key, f.defaultValue!])) };
    });
  }, [fieldsSchema]);

  const autoFilledFields = useMemo(() => fieldsSchema.filter((f) => f.autoFilled), [fieldsSchema]);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleTemplateChange = (value: number | '') => {
    setTemplateId(value);
    setFieldValues({});
  };

  const onSubmit = async () => {
    const subjectId = isCandidate ? subjectCandidateId : subjectUserId;
    if (templateId === '' || subjectId === '') {
      toast.error(`Template and ${isCandidate ? 'candidate' : 'employee'} are required!`);
      return;
    }

    setSubmitting(true);
    try {
      const letter = await createLetter({
        templateId,
        ...(isCandidate ? { subjectCandidateId: subjectId } : { subjectUserId: subjectId }),
        fieldValues,
      });
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
            <Card sx={{ p: { xs: 2, md: 3 } }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                color="primary"
                value={subjectKind}
                onChange={(_event, value) => value && setSubjectKind(value)}
                sx={{ mb: 3 }}
              >
                <ToggleButton value="EMPLOYEE">Employee</ToggleButton>
                <ToggleButton value="CANDIDATE">Candidate</ToggleButton>
              </ToggleButtonGroup>

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

                {isCandidate ? (
                  <TextField
                    select
                    label="Candidate"
                    value={openCandidates.some((c) => c.id === subjectCandidateId) ? subjectCandidateId : ''}
                    onChange={(event) =>
                      setSubjectCandidateId(event.target.value === '' ? '' : Number(event.target.value))
                    }
                    helperText="Candidates without an account yet. The letter moves to their account when Admin converts them."
                  >
                    <MenuItem value="">
                      <em>Select a candidate</em>
                    </MenuItem>
                    {openCandidates.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name} ({c.email.endsWith('@pending.local') ? 'no email yet' : c.email})
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
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
                )}
              </Box>

              {!!templateId && (
                <Stack sx={{ mt: 3 }} spacing={3}>
                  {!!autoFilledFields.length && (
                    <Alert severity="info">
                      {isCandidate
                        ? `Auto-filled at render time: ${autoFilledFields.map((f) => f.label).join(', ')}. A candidate has no employee record yet, so only their name and email are filled in — other auto-filled details (designation, department, salary, …) stay blank until the letter is re-rendered after they're converted.`
                        : `Auto-filled from the employee record at render time: ${autoFilledFields.map((f) => f.label).join(', ')}. Only the fields below need to be filled in manually.`}
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
