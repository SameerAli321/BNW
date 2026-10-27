import type { IconifyName } from 'src/components/iconify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetMyPolicyAcknowledgement } from 'src/actions/about';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import {
  OFFICE_GUIDE_INTRO,
  OFFICE_GUIDE_TITLE,
  OFFICE_GUIDE_CLOSING,
  OFFICE_GUIDE_SECTIONS,
} from './office-guide-content';

// ----------------------------------------------------------------------

/**
 * About us → Guide sheet: the office guide for new joiners (parking, attendance, the OMS portal,
 * who to report to, refreshments, the pool table, meetings, etiquette), then the Employee Policy
 * Handbook, which everyone reads and acknowledges.
 */
export function GuideSheetView() {
  const { ack } = useGetMyPolicyAcknowledgement();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Guide sheet"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Guide sheet' }]}
        sx={{ mb: 3 }}
      />

      <Card
        sx={(theme) => ({
          mb: 3,
          p: { xs: 3, md: 5 },
          color: 'common.white',
          background: `linear-gradient(135deg, ${theme.vars.palette.primary.dark} 0%, ${theme.vars.palette.primary.main} 60%, ${theme.vars.palette.success.main} 140%)`,
        })}
      >
        <Typography variant="h3" component="h1">
          {OFFICE_GUIDE_TITLE}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 760, opacity: 0.9 }}>
          {OFFICE_GUIDE_INTRO}
        </Typography>
      </Card>

      <Grid container spacing={3}>
        {OFFICE_GUIDE_SECTIONS.map((section) => (
          <Grid key={section.id} size={{ xs: 12, md: 6 }}>
            <Card sx={{ p: 3, height: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: 'primary.lighter',
                  }}
                >
                  <Iconify icon={section.icon as IconifyName} width={22} />
                </Box>
                <Typography variant="h6">{section.title}</Typography>
              </Stack>
              <Stack spacing={1.25}>
                {section.paragraphs.map((text) => (
                  <Typography key={text} variant="body2" sx={{ color: 'text.secondary' }}>
                    {text}
                  </Typography>
                ))}
                {section.bullets && (
                  <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1 }}>
                    {section.bullets.map((bullet) => (
                      <Typography
                        key={bullet.text}
                        component="li"
                        variant="body2"
                        sx={{ color: 'text.secondary' }}
                      >
                        {bullet.lead && (
                          <Box component="strong" sx={{ color: 'text.primary' }}>
                            {bullet.lead}:{' '}
                          </Box>
                        )}
                        {bullet.text}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Stack>
            </Card>
          </Grid>
        ))}

        {/* The Employee Policy Handbook — read and acknowledge. */}
        <Grid size={12}>
          <Card
            sx={{
              p: 3,
              gap: 2,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: (theme) => `1px solid ${theme.vars.palette.primary.main}`,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Iconify icon="solar:bill-list-bold" width={32} sx={{ color: 'primary.main' }} />
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6">Employee Policy Handbook</Typography>
                  {ack && (
                    <Label variant="soft" color={ack.acknowledged ? 'success' : 'warning'}>
                      {ack.acknowledged
                        ? `Signed${ack.acknowledgedAt ? ` ${fDate(ack.acknowledgedAt)}` : ''}`
                        : 'Not signed yet'}
                    </Label>
                  )}
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Read the company policies and sign the acknowledgement at the end.
                </Typography>
              </Box>
            </Stack>
            <Button
              component={RouterLink}
              href={paths.dashboard.policyHandbook}
              variant="contained"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
            >
              {ack?.acknowledged ? 'Open the handbook' : 'Read & acknowledge'}
            </Button>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="body1" sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
        {OFFICE_GUIDE_CLOSING}
      </Typography>
    </DashboardContent>
  );
}
