import type { AboutDto } from 'src/actions/about';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { aboutNames, uploadCeoPhoto } from 'src/actions/about';
import { avatarSrc, AVATAR_ACCEPT, AVATAR_MAX_BYTES } from 'src/actions/users';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import {
  Eyebrow,
  GreenRule,
  BRAND_BLUE,
  BRAND_GREEN,
  brandNavyText,
  brandBlueText,
  gridBackground,
  displayHeading,
  BRAND_BLUE_SOFT,
} from './about-brand';

// ----------------------------------------------------------------------

/** Longest first sentence that's still promoted to the big headline when no quote is set. */
const AUTO_HEADLINE_MAX = 140;

/**
 * The headline and the rest of the message: the CEO's own quote, else the message's first sentence
 * (across line breaks) if it's short. A long opening sentence — or a message with no full stop —
 * gets no headline; the whole message goes in the panel instead.
 */
function splitMessage(quote: string, message: string): { headline: string; body: string } {
  const text = message.trim();
  if (quote.trim()) return { headline: quote.trim(), body: text };
  const match = text.match(/^([\s\S]+?[.!?])(\s+|$)([\s\S]*)$/);
  const first = match?.[1].replace(/\s+/g, ' ').trim() ?? '';
  if (!match || first.length > AUTO_HEADLINE_MAX) return { headline: '', body: text };
  return { headline: first, body: match[3] };
}

type Props = {
  about: AboutDto;
  canEdit: boolean;
  onEdit: () => void;
};

/**
 * "CEO's Message" as a poster in the brand colours (after the client's reference posters): the
 * CEO's portrait over a tall blue block with a rounded corner, a big blue headline quote between
 * green quote marks — or the CEO's name when there's no quote — then the full message. CEO / HR /
 * Admin can upload or change the photo from the photo itself.
 */
export function AboutCeoPoster({ about, canEdit, onEdit }: Props) {
  const { ceo, company } = about;
  const { leader } = aboutNames(about.edition);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { headline, body } = splitMessage(ceo.quote ?? '', ceo.message);
  const name = ceo.name || ceo.title;
  const photo = avatarSrc(ceo.photoUrl);
  const hasMessage = !!ceo.message.trim();

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('The photo must be 2 MB or smaller');
      return;
    }
    setUploading(true);
    try {
      await uploadCeoPhoto(file, about.edition);
      toast.success(`${leader}'s photo updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the photo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Stack spacing={3}>
      {/* ================================================== Poster */}
      <Card
        sx={(theme) => ({
          position: 'relative',
          overflow: 'clip', // not 'hidden' — that would stop the photo staying in view (sticky)
          px: { xs: 3, md: 6 },
          pt: { xs: 4, md: 6 },
          pb: { xs: 5, md: 7 },
          ...gridBackground(theme),
        })}
      >
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={onEdit}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 2,
              bgcolor: 'background.paper',
            }}
          >
            Edit
          </Button>
        )}

        <Box
          sx={{
            gap: { xs: 6, md: 8 },
            display: 'grid',
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
          }}
        >
          {/* -------------------------------------------- Portrait on the brand block */}
          {/* On wide screens it stays in view while a long message scrolls past. */}
          <Box
            sx={{
              position: { xs: 'relative', md: 'sticky' },
              top: { md: 96 },
              width: 1,
              maxWidth: { xs: 280, sm: 340, md: 380 },
              mx: 'auto',
              mt: { md: 2 },
              pl: { xs: 5, md: 7 },
              pb: { xs: 3, md: 4 },
            }}
          >
            {/* The tall blue block behind, its big rounded corner showing on the outer side. */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '80%',
                height: '82%',
                borderRadius: { xs: '72px 0 0 0', md: '120px 0 0 0' },
                background: `linear-gradient(160deg, ${BRAND_BLUE} 0%, #0839B8 100%)`,
              }}
            />

            <Box
              sx={(theme) => ({
                position: 'relative',
                aspectRatio: '4 / 5',
                overflow: 'hidden',
                borderRadius: 3,
                border: `6px solid ${theme.vars.palette.background.paper}`,
                boxShadow: '0 28px 56px -24px rgba(11,31,51,0.55)',
                bgcolor: BRAND_BLUE_SOFT,
              })}
            >
              {photo ? (
                <Box
                  component="img"
                  src={photo}
                  alt={name}
                  sx={{ width: 1, height: 1, objectFit: 'cover', objectPosition: 'center top' }}
                />
              ) : (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 1,
                    height: 1,
                    color: BRAND_BLUE,
                    background: `linear-gradient(170deg, #F4F7FE 0%, ${BRAND_BLUE_SOFT} 100%)`,
                  }}
                >
                  <Typography sx={{ fontSize: 110, fontWeight: 800, lineHeight: 1 }}>
                    {name[0]}
                  </Typography>
                  {canEdit && (
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                      No photo yet
                    </Typography>
                  )}
                </Stack>
              )}

              {canEdit && (
                <Button
                  size="small"
                  variant="contained"
                  loading={uploading}
                  startIcon={<Iconify icon="solar:camera-add-bold" />}
                  onClick={() => fileRef.current?.click()}
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 12,
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    bgcolor: 'rgba(11, 31, 51, 0.72)',
                    color: 'common.white',
                    backdropFilter: 'blur(6px)',
                    '&:hover': { bgcolor: 'rgba(11, 31, 51, 0.88)' },
                  }}
                >
                  {photo ? 'Change photo' : 'Upload photo'}
                </Button>
              )}
            </Box>

            {/* Green accents: a bar on top, a ring beside the frame. */}
            <Box
              sx={{
                position: 'absolute',
                top: -14,
                right: 20,
                width: 72,
                height: 8,
                borderRadius: 4,
                bgcolor: BRAND_GREEN,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                right: { xs: -18, md: -30 },
                bottom: '30%',
                width: { xs: 30, md: 40 },
                height: { xs: 30, md: 40 },
                borderRadius: '50%',
                border: `6px solid ${BRAND_GREEN}`,
              }}
            />

            {canEdit && (
              <input
                ref={fileRef}
                type="file"
                accept={AVATAR_ACCEPT}
                hidden
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            )}
          </Box>

          {/* -------------------------------------------- Headline, name, title */}
          <Box sx={{ minWidth: 0, position: 'relative' }}>
            <Eyebrow sx={{ mb: 3 }}>Message from the {leader}</Eyebrow>

            {headline ? (
              <>
                <Iconify
                  icon="mingcute:quote-left-fill"
                  width={56}
                  sx={{ color: BRAND_GREEN, display: 'block', mb: 1.5 }}
                />
                <Typography
                  component="blockquote"
                  sx={(theme) => ({
                    ...displayHeading,
                    ...brandBlueText(theme),
                    fontSize: { xs: 30, sm: 36, md: headline.length > 100 ? 38 : 48 },
                  })}
                >
                  {headline}
                </Typography>
                <Iconify
                  icon="mingcute:quote-left-fill"
                  width={40}
                  sx={{
                    color: BRAND_GREEN,
                    display: 'block',
                    ml: 'auto',
                    mt: 1,
                    opacity: 0.85,
                    transform: 'rotate(180deg)',
                  }}
                />
              </>
            ) : (
              <Typography
                component="h2"
                sx={(theme) => ({
                  ...displayHeading,
                  ...brandBlueText(theme),
                  fontSize: { xs: 36, sm: 44, md: 56 },
                })}
              >
                {name}
              </Typography>
            )}

            <GreenRule sx={{ my: 3 }} />

            {headline && (
              <Typography
                sx={(theme) => ({
                  ...brandNavyText(theme),
                  fontWeight: 800,
                  fontSize: { xs: 20, md: 24 },
                })}
              >
                {name}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{ceo.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {company.name}
            </Typography>

            {canEdit && hasMessage && !ceo.quote?.trim() && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={onEdit}
                sx={{ mt: 2 }}
              >
                Add a headline quote
              </Button>
            )}

            {/* -------------------------------------------- The message, beside the photo */}
            {body.trim() ? (
              <Box
                sx={(theme) => ({
                  mt: 4,
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  borderLeft: `5px solid ${BRAND_GREEN}`,
                  boxShadow: theme.vars.customShadows?.card,
                })}
              >
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontSize: { md: 16 },
                    lineHeight: 1.85,
                    color: 'text.secondary',
                    '&::first-line': { color: 'text.primary', fontWeight: 600 },
                  }}
                >
                  {body.trim()}
                </Typography>
              </Box>
            ) : !hasMessage ? (
              <Stack spacing={2} alignItems="flex-start" sx={{ mt: 4 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  {canEdit
                    ? `The ${leader}'s message hasn't been added yet.`
                    : `A message from our ${leader} is coming soon.`}
                </Typography>
                {canEdit && (
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="solar:pen-bold" />}
                    onClick={onEdit}
                  >
                    Add the {leader}&apos;s message
                  </Button>
                )}
              </Stack>
            ) : null}
          </Box>
        </Box>
      </Card>
    </Stack>
  );
}
