import type { PolicyBlock, PolicySection } from './policy-handbook-content';

import { varAlpha } from 'minimal-shared/utils';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  useGetAbout,
  ABOUT_EDITOR_ROLES,
  POLICY_ACKS_VIEWER_ROLES,
  useGetMyPolicyAcknowledgement,
} from 'src/actions/about';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { AboutEditDialog } from './about-edit-dialog';
import { PolicyHandbookHero } from './policy-handbook-hero';
import { PolicyAcknowledgementCard } from './policy-acknowledgement-card';
import { PolicyAcknowledgementsTable } from './policy-acknowledgements-table';
import {
  groupOf,
  sectionText,
  POLICY_GROUPS,
  readingMinutes,
  POLICY_READING_ORDER,
} from './policy-handbook-content';
import {
  TopicCard,
  PolicyTopics,
  PolicyWhoWeAre,
  PolicyStartHere,
  PolicyQuickFacts,
} from './policy-handbook-overview';

// ----------------------------------------------------------------------

/** Wraps every match of `term` in a highlight. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <Box
        key={i}
        component="mark"
        sx={(theme) => ({
          px: 0.25,
          borderRadius: 0.5,
          color: 'inherit',
          bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.32),
        })}
      >
        {part}
      </Box>
    ) : (
      part
    )
  );
}

function Blocks({ blocks, term }: { blocks: PolicyBlock[]; term: string }) {
  return (
    <Stack spacing={1.5}>
      {blocks.map((block, i) => {
        if (block.kind === 'list') {
          return (
            <Stack key={i} component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {block.items.map((item) => (
                <Stack key={item} component="li" direction="row" spacing={1.25}>
                  <Iconify
                    icon="solar:check-circle-bold"
                    width={18}
                    sx={{ color: 'primary.main', mt: '2px', flexShrink: 0 }}
                  />
                  <Typography variant="body2">
                    <Highlight text={item} term={term} />
                  </Typography>
                </Stack>
              ))}
            </Stack>
          );
        }
        if (block.kind === 'highlight') {
          return (
            <Box
              key={i}
              sx={(theme) => ({
                p: 2,
                borderRadius: 1.5,
                borderLeft: `4px solid ${theme.vars.palette.primary.main}`,
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.06),
              })}
            >
              <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>
                <Highlight text={block.title} term={term} />
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <Highlight text={block.text} term={term} />
              </Typography>
            </Box>
          );
        }
        return (
          <Typography key={i} variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
            <Highlight text={block.text} term={term} />
          </Typography>
        );
      })}
    </Stack>
  );
}

/** One topic, in full. */
function SectionContent({ section, term }: { section: PolicySection; term: string }) {
  return (
    <Stack spacing={3}>
      {!!section.blocks.length && <Blocks blocks={section.blocks} term={term} />}
      {section.subsections?.map((sub) => (
        <Box key={sub.id}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            <Box component="span" sx={{ color: 'primary.main', mr: 1 }}>
              {sub.number}
            </Box>
            <Highlight text={sub.title} term={term} />
          </Typography>
          <Blocks blocks={sub.blocks} term={term} />
        </Box>
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------

/** The reader's last stop, after the final topic. */
const SIGN = 'sign';
const TOTAL = POLICY_READING_ORDER.length;

/** Which topics this person has opened, kept in their browser so they can stop and carry on later. */
function useReadTopics(storageKey: string) {
  const [read, setRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
      setRead(new Set(Array.isArray(saved) ? saved : []));
    } catch {
      setRead(new Set());
    }
  }, [storageKey]);

  const markRead = useCallback(
    (id: string) =>
      setRead((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          // Storage blocked: progress just isn't remembered after a reload.
        }
        return next;
      }),
    [storageKey]
  );

  return { read, markRead };
}

/**
 * About us → the BNW Employee Policy Handbook, laid out for someone new:
 *  - Welcome: a three-step "start here", who we are and the CEO's message, the essential rules at a
 *    glance and every topic grouped into four themes.
 *  - Reader: one topic at a time with previous / next, ending on the acknowledgement, where the
 *    employee signs by typing their name. It's then sent to their manager and HR.
 * CEO / HR / Admin (and Team Leads, for their team) also get an "Acknowledgements" tab.
 */
export function PolicyHandbookView() {
  const { user } = useAuthContext();
  const role = user?.role ?? '';
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const canSeeAcks = POLICY_ACKS_VIEWER_ROLES.includes(role);

  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'handbook' | 'acks'>(
    canSeeAcks && searchParams.get('tab') === 'acknowledgements' ? 'acks' : 'handbook'
  );

  const { about } = useGetAbout();
  // CEO / HR / Admin still edit the company details and the CEO's message.
  const canEditAbout = ABOUT_EDITOR_ROLES.includes(role);
  const [editingAbout, setEditingAbout] = useState(false);
  const { ack } = useGetMyPolicyAcknowledgement();

  const { read, markRead } = useReadTopics(
    `bnw.policy.read.${user?.id ?? user?.email ?? 'me'}.${ack?.version ?? ''}`
  );
  const readCount = POLICY_READING_ORDER.filter((s) => read.has(s.id)).length;

  /** null = the Welcome overview; otherwise the topic open in the reader (or the sign step). */
  const [current, setCurrent] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const term = search.trim();

  const results = useMemo(
    () =>
      term
        ? POLICY_READING_ORDER.filter((s) => sectionText(s).toLowerCase().includes(term.toLowerCase()))
        : [],
    [term]
  );

  const open = (id: string | null) => {
    setTab('handbook');
    setCurrent(id);
    if (id && id !== SIGN) markRead(id);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const openTopic = (id: string) => {
    setSearch('');
    open(id);
  };
  const openFromSearch = (id: string) => open(id);

  const firstUnread = POLICY_READING_ORDER.find((s) => !read.has(s.id))?.id ?? SIGN;

  const renderSearch = () => (
    <TextField
      fullWidth
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Looking for something? Try late, leave, laptop, sick, AI…"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label="Clear search" onClick={() => setSearch('')}>
                <Iconify icon="mingcute:close-line" width={18} />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
      sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
    />
  );

  const renderOverview = () => (
    <Stack spacing={5}>
      <PolicyStartHere
        readCount={readCount}
        signed={!!ack?.acknowledged}
        onContinue={() => open(firstUnread === SIGN ? POLICY_READING_ORDER[0].id : firstUnread)}
        onSign={() => open(SIGN)}
      />

      <Box>
        {renderSearch()}
        {term && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              {results.length
                ? `${results.length} topic${results.length === 1 ? '' : 's'} mention “${term}”`
                : `Nothing in the handbook mentions “${term}”. Try another word, or ask HR.`}
            </Typography>
            <Box
              sx={{
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              }}
            >
              {results.map((section) => (
                <TopicCard key={section.id} section={section} read={read} onOpen={openFromSearch} />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {!term && (
        <>
          {about && <PolicyWhoWeAre about={about} />}
          <PolicyQuickFacts onOpen={openTopic} />
          <PolicyTopics read={read} onOpen={openTopic} />
        </>
      )}
    </Stack>
  );

  const renderRail = () => (
    <Card sx={{ position: 'sticky', top: 88, p: 1.5 }}>
      <Button
        fullWidth
        color="inherit"
        onClick={() => open(null)}
        startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
        sx={{ justifyContent: 'flex-start', mb: 1 }}
      >
        Back to Welcome
      </Button>
      <Stack spacing={2} sx={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', px: 0.5 }}>
        {POLICY_GROUPS.map((group) => (
          <Box key={group.id}>
            <Typography variant="overline" sx={{ px: 1, color: 'text.disabled' }}>
              {group.title}
            </Typography>
            <Stack spacing={0.25} sx={{ mt: 0.5 }}>
              {group.sectionIds.map((id) => {
                const section = POLICY_READING_ORDER.find((s) => s.id === id)!;
                return (
                  <RailItem
                    key={id}
                    label={section.title}
                    active={current === id}
                    done={read.has(id)}
                    onClick={() => openTopic(id)}
                  />
                );
              })}
            </Stack>
          </Box>
        ))}
        <RailItem
          label="Sign the handbook"
          icon="solar:pen-bold"
          active={current === SIGN}
          done={!!ack?.acknowledged}
          onClick={() => open(SIGN)}
        />
      </Stack>
    </Card>
  );

  const renderReader = () => {
    const index = POLICY_READING_ORDER.findIndex((s) => s.id === current);
    const section = index >= 0 ? POLICY_READING_ORDER[index] : null;
    const prev = current === SIGN ? POLICY_READING_ORDER[TOTAL - 1] : POLICY_READING_ORDER[index - 1];
    const next = section ? POLICY_READING_ORDER[index + 1] : undefined;
    const group = section ? groupOf(section.id) : undefined;

    return (
      <Grid container spacing={3}>
        <Grid size={{ md: 4, lg: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          {renderRail()}
        </Grid>

        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          {/* Phones have no rail: back link + a topic picker instead. */}
          <Stack spacing={1.5} sx={{ mb: 2, display: { md: 'none' } }}>
            <Button
              color="inherit"
              onClick={() => open(null)}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Back to Welcome
            </Button>
            <TextField
              select
              size="small"
              label="Topic"
              value={current ?? ''}
              onChange={(e) => openTopic(e.target.value)}
            >
              {POLICY_READING_ORDER.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.number}. {s.title}
                </MenuItem>
              ))}
              <MenuItem value={SIGN}>Sign the handbook</MenuItem>
            </TextField>
          </Stack>

          {section ? (
            <Card sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Box
                  sx={(theme) => ({
                    width: 52,
                    height: 52,
                    flexShrink: 0,
                    display: 'flex',
                    borderRadius: 1.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
                  })}
                >
                  <Iconify icon={section.icon} width={28} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                    {group?.title} · Topic {index + 1} of {TOTAL} · {readingMinutes(section)} min read
                  </Typography>
                  <Typography variant="h4">
                    <Highlight text={section.title} term={term} />
                  </Typography>
                </Box>
              </Stack>

              <SectionContent section={section} term={term} />

              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                sx={{ mt: 4, pt: 3, borderTop: (theme) => `1px dashed ${theme.vars.palette.divider}` }}
              >
                {prev ? (
                  <Button
                    color="inherit"
                    variant="outlined"
                    onClick={() => openTopic(prev.id)}
                    startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                  >
                    {prev.title}
                  </Button>
                ) : (
                  <Box />
                )}
                <Button
                  variant="contained"
                  onClick={() => openTopic(next ? next.id : SIGN)}
                  endIcon={<Iconify icon={next ? 'eva:arrow-ios-forward-fill' : 'solar:pen-bold'} />}
                >
                  {next ? `Next: ${next.title}` : 'Finish & sign'}
                </Button>
              </Stack>
            </Card>
          ) : (
            <Stack spacing={2}>
              <PolicyAcknowledgementCard
                ack={ack}
                fullName={fullName}
                sectionsRead={readCount}
                sectionsTotal={TOTAL}
              />
              {readCount < TOTAL && (
                <Button
                  variant="outlined"
                  onClick={() => open(firstUnread)}
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Read the {TOTAL - readCount} remaining topic{TOTAL - readCount === 1 ? '' : 's'}
                </Button>
              )}
            </Stack>
          )}
        </Grid>
      </Grid>
    );
  };

  return (
    <DashboardContent maxWidth="xl">
      <PolicyHandbookHero
        firstName={user?.firstName ?? ''}
        readCount={readCount}
        total={TOTAL}
        minutes={POLICY_READING_ORDER.reduce((sum, sec) => sum + readingMinutes(sec), 0)}
        parts={POLICY_GROUPS.length}
        signed={!!ack?.acknowledged}
        canEdit={canEditAbout}
        onEdit={() => setEditingAbout(true)}
        onStart={() => open(firstUnread === SIGN ? POLICY_READING_ORDER[0].id : firstUnread)}
        onSign={() => open(SIGN)}
      />

      {canSeeAcks && (
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          sx={{ mb: 3, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
        >
          <Tab value="handbook" label="Handbook" icon={<Iconify icon="solar:notebook-bold-duotone" />} iconPosition="start" />
          <Tab value="acks" label="Acknowledgements" icon={<Iconify icon="solar:verified-check-bold" />} iconPosition="start" />
        </Tabs>
      )}

      {tab === 'acks' && canSeeAcks ? (
        <PolicyAcknowledgementsTable role={role} />
      ) : current ? (
        renderReader()
      ) : (
        renderOverview()
      )}

      {canEditAbout && about && editingAbout && (
        <AboutEditDialog about={about} open onClose={() => setEditingAbout(false)} />
      )}
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type RailItemProps = {
  label: string;
  active: boolean;
  done: boolean;
  icon?: PolicySection['icon'];
  onClick: () => void;
};

function RailItem({ label, active, done, icon, onClick }: RailItemProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={(theme) => ({
        px: 1,
        py: 0.75,
        gap: 1,
        borderRadius: 1,
        justifyContent: 'flex-start',
        textAlign: 'left',
        typography: 'body2',
        color: active ? 'primary.main' : 'text.secondary',
        fontWeight: active ? 600 : 400,
        bgcolor: active ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08) : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
      })}
    >
      {icon && <Iconify icon={icon} width={16} />}
      <Box component="span" sx={{ flex: '1 1 auto' }}>
        {label}
      </Box>
      {done ? (
        <Iconify icon="eva:checkmark-fill" width={16} sx={{ color: 'success.main' }} />
      ) : (
        <Iconify icon="eva:radio-button-off-fill" width={14} sx={{ color: 'text.disabled' }} />
      )}
    </ButtonBase>
  );
}
