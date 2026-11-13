import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetAbout, type AboutEdition, ABOUT_EDITOR_ROLES } from 'src/actions/about';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { useAuthContext } from 'src/auth/hooks';

import { AboutCeoPoster } from './about-ceo-poster';
import { AboutStoryView } from './about-story-view';
import { AboutEditDialog } from './about-edit-dialog';

// ----------------------------------------------------------------------

/**
 * About us, one part per sidebar page: "What is BNW" (the company story — about-story-view) and
 * "CEO's Message" (the CEO's photo and message — about-ceo-poster). Both share the brand look in
 * about-brand.tsx. Everyone reads them; the CEO, HR and Admin edit them from here. There's a BNW
 * and a Hayes edition: Hayes staff only ever get Hayes; the editors switch between the two.
 */
export function AboutUsView({ part = 'company' }: { part?: 'company' | 'ceo' }) {
  const { user } = useAuthContext();
  const canEdit = ABOUT_EDITOR_ROLES.includes(user?.role ?? '');
  const [edition, setEdition] = useState<AboutEdition>('BNW');
  const { about, aboutLoading, aboutError } = useGetAbout(canEdit ? edition : undefined);
  const editor = useBoolean();

  const renderEditionSwitch = () =>
    canEdit && (
      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={edition}
        onChange={(_, next: AboutEdition | null) => next && setEdition(next)}
        sx={{ mb: 3, alignSelf: 'flex-start' }}
      >
        <ToggleButton value="BNW">BNW</ToggleButton>
        <ToggleButton value="HAYES">Hayes (what Hayes staff see)</ToggleButton>
      </ToggleButtonGroup>
    );

  if (aboutLoading) {
    return (
      <DashboardContent>
        {renderEditionSwitch()}
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (aboutError || !about) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Couldn't load About us"
          description="Please try again in a moment."
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      {renderEditionSwitch()}

      {part === 'ceo' ? (
        <AboutCeoPoster about={about} canEdit={canEdit} onEdit={editor.onTrue} />
      ) : (
        <AboutStoryView about={about} canEdit={canEdit} onEdit={editor.onTrue} />
      )}

      {canEdit && about.updatedAt && (
        <Typography
          variant="caption"
          component="p"
          sx={{ mt: 2, color: 'text.disabled', textAlign: 'right' }}
        >
          Last updated {fDateTime(about.updatedAt)}
          {about.updatedByName ? ` by ${about.updatedByName}` : ''}
        </Typography>
      )}

      {canEdit && editor.value && (
        <AboutEditDialog
          about={about}
          open
          onClose={editor.onFalse}
          initialTab={part === 'ceo' ? 'ceo' : 'company'}
        />
      )}
    </DashboardContent>
  );
}
