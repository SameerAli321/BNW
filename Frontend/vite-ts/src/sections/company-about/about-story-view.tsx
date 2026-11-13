import type { ReactNode } from 'react';
import type { IconifyName } from 'src/components/iconify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';
import { aboutNames, type AboutDto } from 'src/actions/about';

import { Iconify } from 'src/components/iconify';

import {
  Eyebrow,
  GreenRule,
  BRAND_BLUE,
  BRAND_NAVY,
  BRAND_GREEN,
  brandNavyText,
  brandBlueText,
  gridBackground,
  displayHeading,
  BRAND_BLUE_SOFT,
} from './about-brand';

// ----------------------------------------------------------------------

const SERVICE_ICONS: IconifyName[] = [
  'solar:file-text-bold',
  'solar:bill-list-bold',
  'solar:users-group-rounded-bold',
  'solar:case-minimalistic-bold',
  'solar:chart-square-outline',
];

/** Paragraphs from a plain text (a blank line starts a new one). */
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

function Paragraphs({ text, size = 'md' }: { text: string; size?: 'md' | 'lg' }) {
  return (
    <Stack spacing={1.75}>
      {paragraphs(text).map((part, i) => (
        <Typography
          key={i}
          sx={{
            color: 'text.secondary',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            fontSize: size === 'lg' ? { md: 17 } : undefined,
          }}
        >
          {part}
        </Typography>
      ))}
    </Stack>
  );
}

/** A story section: eyebrow + big navy heading, then its content. */
function StorySection({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <Card sx={{ p: { xs: 3, md: 5 } }}>
      <Eyebrow sx={{ mb: 1.5 }}>{eyebrow}</Eyebrow>
      <Typography
        component="h2"
        sx={(theme) => ({
          ...displayHeading,
          ...brandNavyText(theme),
          fontSize: { xs: 26, md: 34 },
        })}
      >
        {title}
      </Typography>
      {intro && (
        <Box sx={{ mt: 2.5, maxWidth: 860 }}>
          <Paragraphs text={intro} size="lg" />
        </Box>
      )}
      {children && <Box sx={{ mt: 4 }}>{children}</Box>}
    </Card>
  );
}

/** A white card with an icon and a coloured top edge. */
function InfoCard({
  icon,
  title,
  text,
  accent = BRAND_BLUE,
  badge,
}: {
  icon?: IconifyName;
  title: string;
  text: string;
  accent?: string;
  badge?: string;
}) {
  return (
    <Box
      sx={(theme) => ({
        p: 3,
        height: 1,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.vars.palette.divider}`,
        borderTop: `4px solid ${accent}`,
      })}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            flexShrink: 0,
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: accent === BRAND_GREEN ? BRAND_NAVY : 'common.white',
            bgcolor: accent,
          }}
        >
          {badge ?? (icon && <Iconify icon={icon} width={22} />)}
        </Box>
        <Typography
          variant="subtitle1"
          sx={(theme) => ({ ...brandNavyText(theme), fontWeight: 700 })}
        >
          {title}
        </Typography>
      </Stack>
      <Paragraphs text={text} />
    </Box>
  );
}

const cardGrid = (columns: { xs?: number; sm?: number; md?: number }) => ({
  gap: 2.5,
  display: 'grid',
  gridTemplateColumns: {
    xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
    sm: `repeat(${columns.sm ?? columns.xs ?? 1}, minmax(0, 1fr))`,
    md: `repeat(${columns.md ?? columns.sm ?? 1}, minmax(0, 1fr))`,
  },
});

function ContactLine({ icon, children }: { icon: IconifyName; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          width: 34,
          height: 34,
          display: 'flex',
          flexShrink: 0,
          borderRadius: '50%',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: BRAND_BLUE_SOFT,
          color: BRAND_BLUE,
        }}
      >
        <Iconify icon={icon} width={18} />
      </Box>
      <Box sx={{ pt: 0.75, typography: 'body2', minWidth: 0, wordBreak: 'break-word' }}>
        {children}
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type Props = {
  about: AboutDto;
  canEdit: boolean;
  onEdit: () => void;
};

/**
 * "What is BNW": the company story in the brand look (about-brand.tsx) — welcome hero, who we are,
 * vision and mission, what we do, the sister firm, the six principles, culture, expectations, our
 * commitment, the journey timeline, "your role" and contacts. All text comes from `about.story`,
 * which CEO / HR / Admin edit from here.
 */
export function AboutStoryView({ about, canEdit, onEdit }: Props) {
  const { company, story } = about;
  const hasContact =
    !!company.address || !!company.phones.length || !!company.email || !!company.website;
  const websiteHref = company.website
    ? /^https?:\/\//i.test(company.website)
      ? company.website
      : `https://${company.website}`
    : '';
  const roleParas = paragraphs(story.yourRole);
  const roleClosing = roleParas.length > 1 ? roleParas[roleParas.length - 1] : '';
  const roleBody = roleClosing ? roleParas.slice(0, -1) : roleParas;

  return (
    <Stack spacing={3}>
      {/* ============================================================ Welcome */}
      <Card
        sx={(theme) => ({
          position: 'relative',
          overflow: 'hidden',
          px: { xs: 3, md: 6 },
          py: { xs: 4, md: 6 },
          ...gridBackground(theme),
        })}
      >
        <Box
          sx={{
            gap: { xs: 4, md: 6 },
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Eyebrow sx={{ mb: 2.5 }}>What is {aboutNames(about.edition).company}</Eyebrow>
            <Typography
              component="h1"
              sx={(theme) => ({
                ...displayHeading,
                ...brandBlueText(theme),
                fontSize: { xs: 36, sm: 46, md: 58 },
              })}
            >
              {story.welcomeTitle}
            </Typography>
            {story.welcomeSubtitle && (
              <Typography
                sx={(theme) => ({
                  ...brandNavyText(theme),
                  mt: 1.5,
                  fontSize: { xs: 18, md: 24 },
                  fontWeight: 600,
                })}
              >
                {story.welcomeSubtitle}
              </Typography>
            )}
            <GreenRule sx={{ my: 3 }} />
            <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{company.name}</Typography>
            {company.tagline && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {company.tagline}
              </Typography>
            )}
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={onEdit}
                sx={{ mt: 3 }}
              >
                Edit About us
              </Button>
            )}
          </Box>

          {/* Logo on the blue block — the same shape language as the CEO page. */}
          <Box
            sx={{
              position: 'relative',
              width: 1,
              maxWidth: { xs: 320, md: 400 },
              mx: 'auto',
              pl: { xs: 5, md: 7 },
              pb: 3,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '82%',
                height: '86%',
                borderRadius: { xs: '64px 0 0 0', md: '100px 0 0 0' },
                background: `linear-gradient(160deg, ${BRAND_BLUE} 0%, #0839B8 100%)`,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: -12,
                right: 16,
                width: 64,
                height: 8,
                borderRadius: 4,
                bgcolor: BRAND_GREEN,
              }}
            />
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={(theme) => ({
                position: 'relative',
                aspectRatio: '16 / 11',
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                bgcolor: 'common.white',
                border: `6px solid ${theme.vars.palette.background.paper}`,
                boxShadow: '0 28px 56px -24px rgba(11,31,51,0.55)',
              })}
            >
              {about.edition === 'HAYES' ? (
                // No Hayes logo in the app yet — the company name in the brand type instead.
                <Typography
                  sx={(theme) => ({
                    ...displayHeading,
                    ...brandBlueText(theme),
                    fontSize: { xs: 36, md: 48 },
                    textAlign: 'center',
                  })}
                >
                  {company.name}
                </Typography>
              ) : (
                <Box
                  component="img"
                  alt="BNW Chartered Accountants"
                  src={`${CONFIG.assetsDir}/logo/logo-full.png`}
                  sx={{ width: 1, maxWidth: 280, objectFit: 'contain' }}
                />
              )}
            </Stack>
          </Box>
        </Box>
      </Card>

      {/* ============================================================ Who we are */}
      {story.whoWeAre && (
        <StorySection eyebrow="Our story" title="Who We Are">
          <Box sx={{ maxWidth: 920 }}>
            <Paragraphs text={story.whoWeAre} size="lg" />
          </Box>
        </StorySection>
      )}

      {/* ============================================================ Vision & mission */}
      {(story.vision || story.mission) && (
        <Box sx={cardGrid({ xs: 1, md: story.vision && story.mission ? 2 : 1 })}>
          {story.vision && (
            <Card sx={{ p: { xs: 3, md: 4 }, borderTop: `5px solid ${BRAND_BLUE}` }}>
              <Eyebrow sx={{ mb: 1 }}>Where we are going</Eyebrow>
              <Typography variant="h4" sx={(theme) => ({ ...brandNavyText(theme), mb: 2 })}>
                Our Vision
              </Typography>
              <Paragraphs text={story.vision} />
            </Card>
          )}
          {story.mission && (
            <Card sx={{ p: { xs: 3, md: 4 }, borderTop: `5px solid ${BRAND_GREEN}` }}>
              <Eyebrow sx={{ mb: 1 }}>Why we do it</Eyebrow>
              <Typography variant="h4" sx={(theme) => ({ ...brandNavyText(theme), mb: 2 })}>
                Our Mission
              </Typography>
              <Paragraphs text={story.mission} />
            </Card>
          )}
        </Box>
      )}

      {/* ============================================================ What we do */}
      {(story.servicesIntro || !!story.services.length) && (
        <StorySection eyebrow="Our services" title="What We Do" intro={story.servicesIntro}>
          {!!story.services.length && (
            <Box sx={cardGrid({ xs: 1, sm: 2, md: 3 })}>
              {story.services.map((service, i) => (
                <InfoCard
                  key={`${service.title}-${i}`}
                  icon={SERVICE_ICONS[i % SERVICE_ICONS.length]}
                  title={service.title}
                  text={service.text}
                  accent={i % 2 ? BRAND_GREEN : BRAND_BLUE}
                />
              ))}
            </Box>
          )}
          {story.servicesOutro && (
            <Typography
              sx={(theme) => ({
                ...brandBlueText(theme),
                mt: 3,
                fontWeight: 600,
                fontSize: { md: 17 },
              })}
            >
              {story.servicesOutro}
            </Typography>
          )}
        </StorySection>
      )}

      {/* ============================================================ Group & sister firm */}
      {(story.groupIntro || !!story.firms.length || story.groupText) && (
        <StorySection
          eyebrow="Our group"
          title="Our Group Structure & Sister Firm"
          intro={story.groupIntro}
        >
          {!!story.firms.length && (
            <Box sx={cardGrid({ xs: 1, md: Math.min(story.firms.length, 3) })}>
              {story.firms.map((firm, i) => (
                <InfoCard
                  key={`${firm.title}-${i}`}
                  icon="solar:home-angle-bold-duotone"
                  title={firm.title}
                  text={firm.text}
                  accent={i % 2 ? BRAND_GREEN : BRAND_BLUE}
                />
              ))}
            </Box>
          )}
          {story.groupMotto && (
            <Box
              sx={{
                my: 4,
                px: { xs: 3, md: 5 },
                py: { xs: 3, md: 4 },
                borderRadius: 2,
                color: 'common.white',
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(120deg, ${BRAND_NAVY} 0%, #0D2C6B 55%, ${BRAND_BLUE} 100%)`,
              }}
            >
              <Iconify
                icon="mingcute:quote-left-fill"
                width={36}
                sx={{ color: BRAND_GREEN, display: 'block', mb: 1 }}
              />
              <Typography sx={{ ...displayHeading, fontSize: { xs: 22, md: 30 } }}>
                {story.groupMotto}
              </Typography>
            </Box>
          )}
          {story.groupText && <Paragraphs text={story.groupText} />}
        </StorySection>
      )}

      {/* ============================================================ Philosophy */}
      {(story.philosophyIntro || !!story.principles.length) && (
        <StorySection eyebrow="Our philosophy" title={`The ${aboutNames(about.edition).company} Way`} intro={story.philosophyIntro}>
          {!!story.principles.length && (
            <Box sx={cardGrid({ xs: 1, sm: 2, md: 3 })}>
              {story.principles.map((principle, i) => (
                <InfoCard
                  key={`${principle.title}-${i}`}
                  badge={String(i + 1).padStart(2, '0')}
                  title={principle.title}
                  text={principle.text}
                  accent={i % 2 ? BRAND_GREEN : BRAND_BLUE}
                />
              ))}
            </Box>
          )}
        </StorySection>
      )}

      {/* ============================================================ Culture */}
      {story.culture && (
        <StorySection eyebrow="Our culture" title="Our People, Our Culture">
          <Box sx={{ maxWidth: 920 }}>
            <Paragraphs text={story.culture} />
          </Box>
        </StorySection>
      )}

      {/* ============================================================ Expectations */}
      {(story.expectationsIntro || !!story.expectations.length) && (
        <StorySection
          eyebrow="Our standards"
          title="What We Expect From Every Team Member"
          intro={story.expectationsIntro}
        >
          {!!story.expectations.length && (
            <Box sx={cardGrid({ xs: 1, md: 2 })}>
              {story.expectations.map((item, i) => (
                <Stack
                  key={`${item.title}-${i}`}
                  direction="row"
                  spacing={1.5}
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: BRAND_BLUE_SOFT,
                    ...theme.applyStyles('dark', { bgcolor: 'rgba(126,166,255,0.1)' }),
                  })}
                >
                  <Iconify
                    icon="solar:check-circle-bold"
                    width={22}
                    sx={{ color: '#2BB816', flexShrink: 0, mt: '1px' }}
                  />
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                    <Box component="strong" sx={brandNavyText}>
                      {item.title}:
                    </Box>{' '}
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {item.text}
                    </Box>
                  </Typography>
                </Stack>
              ))}
            </Box>
          )}
          {story.expectationsOutro && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 1.5,
                borderLeft: `5px solid ${BRAND_GREEN}`,
                bgcolor: 'background.neutral',
              }}
            >
              <Paragraphs text={story.expectationsOutro} />
            </Box>
          )}
        </StorySection>
      )}

      {/* ============================================================ Commitment */}
      {story.commitment && (
        <StorySection eyebrow="Our promise" title="Our Commitment to Our People">
          <Paragraphs text={story.commitment} size="lg" />
        </StorySection>
      )}

      {/* ============================================================ Journey */}
      {(story.journeyIntro || !!story.milestones.length) && (
        <StorySection
          eyebrow="Our journey"
          title="Our Journey & The Road Ahead"
          intro={story.journeyIntro}
        >
          {!!story.milestones.length && (
            <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {story.milestones.map((step, i) => {
                const last = i === story.milestones.length - 1;
                return (
                  <Box
                    key={`${step.date}-${i}`}
                    component="li"
                    sx={{
                      display: 'grid',
                      columnGap: { xs: 2, md: 3 },
                      gridTemplateColumns: { xs: '20px 1fr', md: '150px 20px 1fr' },
                    }}
                  >
                    <Typography
                      sx={(theme) => ({
                        ...brandBlueText(theme),
                        display: { xs: 'none', md: 'block' },
                        fontWeight: 800,
                        fontSize: 18,
                        textAlign: 'right',
                        pt: '1px',
                      })}
                    >
                      {step.date}
                    </Typography>
                    {/* Dot and connecting line */}
                    <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <Box
                        sx={{
                          zIndex: 1,
                          mt: '5px',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: last ? BRAND_GREEN : BRAND_BLUE,
                          boxShadow: `0 0 0 4px ${BRAND_BLUE_SOFT}`,
                        }}
                      />
                      {!last && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 21,
                            bottom: 0,
                            width: 2,
                            bgcolor: BRAND_BLUE_SOFT,
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ pb: last ? 0 : 4, minWidth: 0 }}>
                      <Typography
                        sx={(theme) => ({
                          ...brandBlueText(theme),
                          display: { md: 'none' },
                          fontWeight: 800,
                        })}
                      >
                        {step.date}
                      </Typography>
                      <Typography variant="h6" sx={(theme) => ({ ...brandNavyText(theme), mb: 1 })}>
                        {step.title}
                      </Typography>
                      <Paragraphs text={step.text} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
          {story.journeyOutro && (
            <Box sx={{ mt: 4 }}>
              <Paragraphs text={story.journeyOutro} />
            </Box>
          )}
        </StorySection>
      )}

      {/* ============================================================ Your role + contact */}
      <Box sx={{ gap: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '8fr 4fr' } }}>
        {story.yourRole ? (
          <Card
            sx={{
              p: { xs: 3, md: 5 },
              color: 'common.white',
              position: 'relative',
              overflow: 'hidden',
              background: `linear-gradient(130deg, ${BRAND_NAVY} 0%, #0D2C6B 55%, ${BRAND_BLUE} 100%)`,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 420,
                height: 420,
                right: -160,
                top: -200,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${BRAND_GREEN}40 0%, transparent 65%)`,
              }}
            />
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
              <Box sx={{ width: 28, height: 3, borderRadius: 2, bgcolor: BRAND_GREEN }} />
              <Typography variant="overline" sx={{ color: BRAND_GREEN, letterSpacing: 2.5 }}>
                Your role
              </Typography>
            </Stack>
            <Typography
              component="h2"
              sx={{ ...displayHeading, fontSize: { xs: 26, md: 34 }, mb: 3 }}
            >
              Your Role in Our Story
            </Typography>
            <Stack spacing={1.75} sx={{ position: 'relative' }}>
              {roleBody.map((part, i) => (
                <Typography key={i} sx={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.8 }}>
                  {part}
                </Typography>
              ))}
            </Stack>
            {roleClosing && (
              <Typography
                sx={{
                  ...displayHeading,
                  position: 'relative',
                  mt: 4,
                  pt: 3,
                  borderTop: '1px solid rgba(255,255,255,0.18)',
                  fontSize: { xs: 20, md: 26 },
                  color: BRAND_GREEN,
                }}
              >
                {roleClosing}
              </Typography>
            )}
          </Card>
        ) : (
          <Box />
        )}

        {/* Hidden until there's something to show (the Hayes edition starts empty). */}
        {hasContact && (
        <Card sx={{ p: { xs: 3, md: 4 }, borderTop: `5px solid ${BRAND_GREEN}` }}>
          <Typography variant="h6" sx={(theme) => ({ ...brandNavyText(theme), mb: 0.5 })}>
            Contact us
          </Typography>
          <GreenRule sx={{ width: 40, height: 4, mb: 3 }} />
          <Stack spacing={2}>
            {company.address && (
              <ContactLine icon="mingcute:location-fill">{company.address}</ContactLine>
            )}
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
        </Card>
        )}
      </Box>
    </Stack>
  );
}
