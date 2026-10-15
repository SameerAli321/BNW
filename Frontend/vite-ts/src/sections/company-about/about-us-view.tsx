import type { ReactNode } from 'react';

import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { avatarSrc } from 'src/actions/users';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetAbout, ABOUT_EDITOR_ROLES } from 'src/actions/about';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { useAuthContext } from 'src/auth/hooks';

import { AboutEditDialog } from './about-edit-dialog';

// ----------------------------------------------------------------------

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <Card sx={{ p: { xs: 2.5, md: 3 }, height: 1 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Box
          sx={(theme) => ({
            width: 36,
            height: 36,
            display: 'flex',
            borderRadius: 1.25,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
          })}
        >
          <Iconify icon={icon as 'solar:info-circle-bold'} width={20} />
        </Box>
        <Typography variant="h6">{title}</Typography>
      </Stack>
      {children}
    </Card>
  );
}

function ContactLine({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Iconify icon={icon as 'solar:phone-bold'} width={20} sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
      <Box sx={{ typography: 'body2', minWidth: 0, wordBreak: 'break-word' }}>{children}</Box>
    </Stack>
  );
}

/**
 * About us — company details first (who we are, mission / vision, what we do, contacts), then the
 * CEO's message with their photo. Everyone reads it; the CEO, HR and Admin edit it from here.
 */
export function AboutUsView() {
  const { user } = useAuthContext();
  const canEdit = ABOUT_EDITOR_ROLES.includes(user?.role ?? '');
  const { about, aboutLoading, aboutError } = useGetAbout();
  const editor = useBoolean();

  if (aboutLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  if (aboutError || !about) {
    return (
      <DashboardContent>
        <EmptyContent filled title="Couldn't load About us" description="Please try again in a moment." sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  const { company, ceo } = about;
  const websiteHref = company.website
    ? /^https?:\/\//i.test(company.website)
      ? company.website
      : `https://${company.website}`
    : '';

  return (
    <DashboardContent>
      {/* ---------------------------------------------------------------- Company */}
      <Card
        sx={(theme) => ({
          mb: 3,
          p: { xs: 3, md: 5 },
          color: 'common.white',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.vars.palette.primary.dark} 0%, ${theme.vars.palette.primary.main} 60%, ${theme.vars.palette.success.main} 140%)`,
        })}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ opacity: 0.8 }}>
              About us
            </Typography>
            <Typography variant="h3" component="h1" sx={{ mt: 0.5 }}>
              {company.name}
            </Typography>
            {company.tagline && (
              <Typography variant="h6" sx={{ mt: 1, opacity: 0.85, fontWeight: 400 }}>
                {company.tagline}
              </Typography>
            )}
          </Box>
          {canEdit && (
            <Button
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={editor.onTrue}
              sx={{ color: 'primary.dark', bgcolor: 'common.white', '&:hover': { bgcolor: 'grey.100' } }}
            >
              Edit
            </Button>
          )}
        </Stack>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Section title="Who we are" icon="solar:info-circle-bold">
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                {company.about || 'No description yet.'}
              </Typography>
            </Section>

            {(company.mission || company.vision) && (
              <Grid container spacing={3}>
                {company.mission && (
                  <Grid size={{ xs: 12, sm: company.vision ? 6 : 12 }}>
                    <Section title="Our mission" icon="solar:flag-bold">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                        {company.mission}
                      </Typography>
                    </Section>
                  </Grid>
                )}
                {company.vision && (
                  <Grid size={{ xs: 12, sm: company.mission ? 6 : 12 }}>
                    <Section title="Our vision" icon="solar:eye-bold">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                        {company.vision}
                      </Typography>
                    </Section>
                  </Grid>
                )}
              </Grid>
            )}

            {!!company.services.length && (
              <Section title="What we do" icon="solar:case-minimalistic-bold">
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                  {company.services.map((service) => (
                    <Chip
                      key={service}
                      label={service}
                      variant="soft"
                      color="primary"
                      icon={<Iconify icon="solar:check-circle-bold" width={18} />}
                    />
                  ))}
                </Stack>
              </Section>
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Section title="Contact us" icon="solar:phone-bold">
            <Stack spacing={2}>
              {company.address && <ContactLine icon="mingcute:location-fill">{company.address}</ContactLine>}
              {company.phones.map((phone) => (
                <ContactLine key={phone} icon="solar:phone-bold">
                  <Link href={`tel:${phone.replace(/[^\d+]/g, '')}`} color="inherit">
                    {phone}
                  </Link>
                </ContactLine>
              ))}
              {company.email && (
                <ContactLine icon="solar:letter-bold">
                  <Link href={`mailto:${company.email}`} color="inherit">
                    {company.email}
                  </Link>
                </ContactLine>
              )}
              {company.website && (
                <ContactLine icon="eva:external-link-fill">
                  <Link href={websiteHref} target="_blank" rel="noopener" color="inherit">
                    {company.website}
                  </Link>
                </ContactLine>
              )}
            </Stack>
          </Section>
        </Grid>

        {/* -------------------------------------------------------------- CEO's message */}
        <Grid size={12}>
          <Card sx={{ p: { xs: 3, md: 5 } }}>
            <Grid container spacing={{ xs: 3, md: 5 }} alignItems="flex-start">
              <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'center' }}>
                <Avatar
                  src={avatarSrc(ceo.photoUrl)}
                  alt={ceo.name || 'CEO'}
                  variant="rounded"
                  sx={(theme) => ({
                    mx: 'auto',
                    width: { xs: 180, md: 240 },
                    height: { xs: 180, md: 240 },
                    fontSize: 72,
                    borderRadius: 3,
                    boxShadow: theme.vars.customShadows?.z16,
                    bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                    color: 'primary.main',
                  })}
                >
                  {(ceo.name || 'CEO')[0]}
                </Avatar>
                <Typography variant="h6" sx={{ mt: 2.5 }}>
                  {ceo.name || 'Chief Executive Officer'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {ceo.title}
                  {ceo.title ? ', ' : ''}
                  {company.name}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="overline" sx={{ color: 'primary.main' }}>
                  Message from the CEO
                </Typography>
                {ceo.message ? (
                  <>
                    <Iconify
                      icon="mingcute:quote-left-fill"
                      width={40}
                      sx={(theme) => ({
                        display: 'block',
                        my: 1,
                        color: varAlpha(theme.vars.palette.primary.mainChannel, 0.32),
                      })}
                    />
                    <Typography
                      variant="body1"
                      sx={{ whiteSpace: 'pre-wrap', fontSize: { md: 17 }, lineHeight: 1.8 }}
                    >
                      {ceo.message}
                    </Typography>
                    <Box sx={{ mt: 3, pt: 2, borderTop: (theme) => `1px dashed ${theme.vars.palette.divider}` }}>
                      <Typography variant="subtitle1" sx={{ fontStyle: 'italic' }}>
                        {ceo.name || 'Chief Executive Officer'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {ceo.title}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                      {canEdit
                        ? "The CEO's message hasn't been added yet."
                        : 'A message from our CEO is coming soon.'}
                    </Typography>
                    {canEdit && (
                      <Box>
                        <Button variant="contained" startIcon={<Iconify icon="solar:pen-bold" />} onClick={editor.onTrue}>
                          Add the CEO&apos;s message
                        </Button>
                      </Box>
                    )}
                  </Stack>
                )}
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {canEdit && about.updatedAt && (
        <Typography variant="caption" component="p" sx={{ mt: 2, color: 'text.disabled', textAlign: 'right' }}>
          Last updated {fDateTime(about.updatedAt)}
          {about.updatedByName ? ` by ${about.updatedByName}` : ''}
        </Typography>
      )}

      {canEdit && editor.value && <AboutEditDialog about={about} open onClose={editor.onFalse} />}
    </DashboardContent>
  );
}
