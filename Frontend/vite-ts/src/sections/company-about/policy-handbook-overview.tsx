import type { AboutDto } from 'src/actions/about';
import type { PolicySection } from './policy-handbook-content';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { avatarSrc } from 'src/actions/users';

import { Iconify } from 'src/components/iconify';

import {
  POLICY_GROUPS,
  readingMinutes,
  POLICY_QUICK_FACTS,
  POLICY_READING_ORDER,
} from './policy-handbook-content';

// ----------------------------------------------------------------------

const sectionById = new Map(POLICY_READING_ORDER.map((s) => [s.id, s]));

function IconTile({ icon, size = 44 }: { icon: PolicySection['icon']; size?: number }) {
  return (
    <Box
      sx={(theme) => ({
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        borderRadius: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        color: 'primary.main',
        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
      })}
    >
      <Iconify icon={icon} width={size * 0.55} />
    </Box>
  );
}

function SectionHeading({ title, caption }: { title: string; caption?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h5">{title}</Typography>
      {caption && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

type StartHereProps = {
  readCount: number;
  signed: boolean;
  onContinue: () => void;
  onSign: () => void;
};

/** Three steps a new joiner follows; the next one to do is highlighted. */
export function PolicyStartHere({ readCount, signed, onContinue, onSign }: StartHereProps) {
  const total = POLICY_READING_ORDER.length;
  const readAll = readCount >= total;
  const minutes = POLICY_READING_ORDER.reduce((sum, s) => sum + readingMinutes(s), 0);

  const steps = [
    {
      title: 'Get to know BNW',
      text: 'Who we are, a message from our CEO and the rules that matter most. They are all on this page.',
      done: true,
    },
    {
      title: 'Read the handbook',
      text: `${total} short topics, about ${minutes} minutes in all. You can stop and come back later.`,
      done: readAll,
      action: (
        <Button
          variant="contained"
          onClick={onContinue}
          endIcon={<Iconify icon="eva:arrow-forward-fill" />}
        >
          {readCount ? `Continue (${readCount}/${total})` : 'Start reading'}
        </Button>
      ),
    },
    {
      title: 'Sign to confirm',
      text: 'Type your name to confirm you have read it. Your manager and HR get a copy.',
      done: signed,
      action: (
        <Button
          variant={readAll ? 'contained' : 'outlined'}
          color="inherit"
          onClick={onSign}
          startIcon={<Iconify icon="solar:pen-bold" />}
        >
          {signed ? 'View signature' : 'Sign'}
        </Button>
      ),
    },
  ];
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <Card sx={{ p: { xs: 2.5, md: 3 } }}>
      <Typography variant="overline" sx={{ color: 'primary.main' }}>
        New here? Start here
      </Typography>
      <Box
        sx={{
          mt: 2,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {steps.map((step, index) => {
          const isNext = index === nextIndex;
          return (
            <Stack
              key={step.title}
              spacing={1.5}
              sx={(theme) => ({
                p: 2,
                borderRadius: 1.5,
                border: `1px solid ${isNext ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
                bgcolor: isNext ? varAlpha(theme.vars.palette.primary.mainChannel, 0.04) : 'transparent',
              })}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    display: 'flex',
                    borderRadius: '50%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    typography: 'subtitle2',
                    color: step.done || isNext ? 'common.white' : 'text.secondary',
                    bgcolor: step.done ? 'success.main' : isNext ? 'primary.main' : 'action.selected',
                  }}
                >
                  {step.done ? <Iconify icon="eva:checkmark-fill" width={18} /> : index + 1}
                </Box>
                <Typography variant="subtitle1">{step.title}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', flex: '1 1 auto' }}>
                {step.text}
              </Typography>
              {step.action && <Box>{step.action}</Box>}
            </Stack>
          );
        })}
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

/** Company summary, the CEO's message and who to contact. All of it is edited from "Edit CEO message". */
export function PolicyWhoWeAre({ about }: { about: AboutDto }) {
  const { company, ceo } = about;
  const intro = company.about || company.tagline;

  return (
    <Box>
      <SectionHeading title={`Welcome to ${company.name || 'BNW'}`} />
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: ceo.message ? '1fr 1fr' : '1fr' },
        }}
      >
        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            {intro && (
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
                {intro}
              </Typography>
            )}
            {company.mission && (
              <Box>
                <Typography variant="subtitle2">Our mission</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {company.mission}
                </Typography>
              </Box>
            )}
            {(company.email || !!company.phones.length) && (
              <Box
                sx={(theme) => ({
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                })}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Questions? Ask HR or your manager
                </Typography>
                <Stack spacing={0.75}>
                  {company.email && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Iconify icon="solar:letter-bold" width={18} sx={{ color: 'primary.main' }} />
                      <Link href={`mailto:${company.email}`} variant="body2" color="inherit">
                        {company.email}
                      </Link>
                    </Stack>
                  )}
                  {company.phones.map((phone) => (
                    <Stack key={phone} direction="row" spacing={1} alignItems="center">
                      <Iconify icon="solar:phone-bold" width={18} sx={{ color: 'primary.main' }} />
                      <Link href={`tel:${phone.replace(/\s+/g, '')}`} variant="body2" color="inherit">
                        {phone}
                      </Link>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Card>

        {ceo.message && (
          <Card sx={{ p: { xs: 2.5, md: 3 } }}>
            <Iconify icon="mingcute:quote-left-fill" width={32} sx={{ color: 'primary.main', opacity: 0.4 }} />
            <Typography
              variant="body2"
              sx={{ mt: 1, whiteSpace: 'pre-line', fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.75 }}
            >
              {ceo.message}
            </Typography>
            {ceo.name && (
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2.5 }}>
                <Avatar src={avatarSrc(ceo.photoUrl)} alt={ceo.name} sx={{ width: 44, height: 44 }}>
                  {ceo.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2">{ceo.name}</Typography>
                  {ceo.title && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {ceo.title}
                    </Typography>
                  )}
                </Box>
              </Stack>
            )}
          </Card>
        )}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function PolicyQuickFacts({ onOpen }: { onOpen: (sectionId: string) => void }) {
  return (
    <Box>
      <SectionHeading
        title="The essentials at a glance"
        caption="The rules people ask about most. Click a card to read the full policy."
      />
      <Box
        sx={{
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        }}
      >
        {POLICY_QUICK_FACTS.map((fact) => (
          <Card key={fact.label} sx={{ display: 'flex' }}>
            <ButtonBase
              onClick={() => onOpen(fact.sectionId)}
              sx={{ p: 2, gap: 2, width: 1, alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left' }}
            >
              <IconTile icon={fact.icon} size={40} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {fact.label}
                </Typography>
                <Typography variant="subtitle1">{fact.value}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  {fact.detail}
                </Typography>
              </Box>
            </ButtonBase>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

type TopicProps = { read: Set<string>; onOpen: (sectionId: string) => void };

export function TopicCard({
  section,
  read,
  onOpen,
}: { section: PolicySection } & TopicProps) {
  const isRead = read.has(section.id);
  return (
    <Card sx={{ display: 'flex' }}>
      <ButtonBase
        onClick={() => onOpen(section.id)}
        sx={{ p: 2, gap: 2, width: 1, alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left' }}
      >
        <IconTile icon={section.icon} />
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Typography variant="subtitle1">{section.title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {section.summary}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, typography: 'caption' }}>
            {isRead ? (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'success.main' }}>
                <Iconify icon="eva:checkmark-fill" width={16} />
                <span>Read</span>
              </Stack>
            ) : (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {readingMinutes(section)} min read
              </Box>
            )}
          </Stack>
        </Box>
      </ButtonBase>
    </Card>
  );
}

/** Every topic, grouped by theme. */
export function PolicyTopics({ read, onOpen }: TopicProps) {
  return (
    <Box>
      <SectionHeading
        title="All topics"
        caption="The full handbook, in four parts. Open any topic. Each one is short."
      />
      <Stack spacing={3}>
        {POLICY_GROUPS.map((group) => {
          const done = group.sectionIds.filter((id) => read.has(id)).length;
          return (
            <Box key={group.id}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Iconify icon={group.icon} width={20} sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1">{group.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  · {group.description}
                </Typography>
                <Box sx={{ flex: '1 1 auto' }} />
                <Typography variant="caption" sx={{ color: done === group.sectionIds.length ? 'success.main' : 'text.disabled' }}>
                  {done}/{group.sectionIds.length} read
                </Typography>
              </Stack>
              <Box
                sx={{
                  gap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                }}
              >
                {group.sectionIds.map((id) => (
                  <TopicCard key={id} section={sectionById.get(id)!} read={read} onOpen={onOpen} />
                ))}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
