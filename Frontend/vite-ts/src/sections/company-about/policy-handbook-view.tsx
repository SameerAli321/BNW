import type { ReactNode } from 'react';
import type { PolicyBlock, PolicySection } from './policy-handbook-content';

import { varAlpha } from 'minimal-shared/utils';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';

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
import { sectionText, POLICY_SECTIONS } from './policy-handbook-content';
import { PolicyAcknowledgementCard } from './policy-acknowledgement-card';
import { PolicyAcknowledgementsTable } from './policy-acknowledgements-table';
import { AnimatedAboutHeading, AnimatedAboutBackdrop } from './animated-about-heading';

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

type SectionCardProps = {
  section: PolicySection;
  term: string;
  open: boolean;
  read: boolean;
  onToggle: () => void;
  refCallback: (el: HTMLDivElement | null) => void;
};

function SectionCard({ section, term, open, read, onToggle, refCallback }: SectionCardProps) {
  return (
    <Card
      ref={refCallback}
      id={`policy-${section.id}`}
      data-section-id={section.id}
      sx={{ scrollMarginTop: 96 }}
    >
      <ButtonBase
        onClick={onToggle}
        aria-expanded={open}
        sx={{ width: 1, p: { xs: 2, md: 2.5 }, gap: 2, justifyContent: 'flex-start', textAlign: 'left' }}
      >
        <Box
          sx={(theme) => ({
            width: 44,
            height: 44,
            flexShrink: 0,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
          })}
        >
          <Iconify icon={section.icon} width={24} />
        </Box>
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: 'text.disabled', lineHeight: 1.5 }}>
            Section {section.number}
          </Typography>
          <Typography variant="h6">
            <Highlight text={section.title} term={term} />
          </Typography>
        </Box>
        {read && (
          <Chip
            size="small"
            color="success"
            variant="soft"
            label="Read"
            icon={<Iconify icon="eva:checkmark-fill" />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          />
        )}
        <Iconify
          icon="eva:arrow-ios-downward-fill"
          sx={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </ButtonBase>

      <Collapse in={open} unmountOnExit={false}>
        <Box sx={{ px: { xs: 2, md: 2.5 }, pb: { xs: 2.5, md: 3 }, pl: { md: 10 } }}>
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
        </Box>
      </Collapse>
    </Card>
  );
}

// ----------------------------------------------------------------------

/**
 * About us → the BNW Employee Policy Handbook. A contents rail (with what you've read ticked off),
 * search with highlighted matches, expand / collapse per section, and at the end the employee's
 * acknowledgement — signed by typing their name and sent to their manager and HR. CEO / HR /
 * Admin (and Team Leads, for their team) also get an "Acknowledgements" tab showing who has signed.
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
  // CEO / HR / Admin still edit the company details and the CEO's message shown above the handbook.
  const canEditAbout = ABOUT_EDITOR_ROLES.includes(role);
  const [editingAbout, setEditingAbout] = useState(false);
  const { ack } = useGetMyPolicyAcknowledgement();

  const [search, setSearch] = useState('');
  const term = search.trim();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [read, setRead] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string>(POLICY_SECTIONS[0].id);
  const refs = useRef(new Map<string, HTMLDivElement>());

  const sections = useMemo(
    () =>
      term
        ? POLICY_SECTIONS.filter((s) => sectionText(s).toLowerCase().includes(term.toLowerCase()))
        : POLICY_SECTIONS,
    [term]
  );

  // Ticks a section off as read once it has been on screen, and tracks the one being read.
  useEffect(() => {
    if (tab !== 'handbook') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = (entry.target as HTMLElement).dataset.sectionId;
          if (!id) return;
          setActive(id);
          setRead((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
        });
      },
      { rootMargin: '-15% 0px -45% 0px' }
    );
    refs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tab, sections]);

  const refFor = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) refs.current.set(id, el);
      else refs.current.delete(id);
    },
    []
  );

  const goTo = (id: string) => {
    setSearch('');
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setRead((prev) => new Set(prev).add(id));
    requestAnimationFrame(() =>
      document.getElementById(`policy-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed = collapsed.size === POLICY_SECTIONS.length;
  const readCount = POLICY_SECTIONS.filter((s) => read.has(s.id)).length;

  const scrollToSign = () =>
    document
      .getElementById('policy-acknowledgement')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const renderHero = (): ReactNode => (
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
      <AnimatedAboutBackdrop />
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ position: 'relative' }}
      >
        <AnimatedAboutHeading />

        <Stack spacing={1.5} alignItems={{ xs: 'flex-start', md: 'flex-end' }} sx={{ flexShrink: 0 }}>
        {ack?.acknowledged ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 2, py: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.16)' }}
          >
            <Iconify icon="solar:verified-check-bold" width={24} />
            <Typography variant="subtitle2">You&apos;ve signed this handbook</Typography>
          </Stack>
        ) : (
          <Button
            size="large"
            variant="contained"
            color="inherit"
            onClick={() => {
              setTab('handbook');
              requestAnimationFrame(scrollToSign);
            }}
            startIcon={<Iconify icon="solar:pen-bold" />}
            sx={{ color: 'primary.main', bgcolor: 'common.white', flexShrink: 0 }}
          >
            Read & sign
          </Button>
        )}
        {canEditAbout && (
          <Button
            size="small"
            color="inherit"
            onClick={() => setEditingAbout(true)}
            startIcon={<Iconify icon="solar:pen-bold" />}
            sx={{ color: 'common.white', opacity: 0.9 }}
          >
            Edit CEO message
          </Button>
        )}
        </Stack>
      </Stack>
    </Card>
  );

  const renderContents = () => (
    <Card sx={{ position: 'sticky', top: 88, p: 2 }}>
      <Typography variant="subtitle2" sx={{ px: 1 }}>
        Contents
      </Typography>
      <Box sx={{ px: 1, mt: 1, mb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Read
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {readCount}/{POLICY_SECTIONS.length}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={(readCount / POLICY_SECTIONS.length) * 100}
          color={readCount === POLICY_SECTIONS.length ? 'success' : 'primary'}
          sx={{ height: 4, borderRadius: 2 }}
        />
      </Box>
      <Stack spacing={0.25} sx={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {POLICY_SECTIONS.map((section) => {
          const isActive = active === section.id;
          return (
            <ButtonBase
              key={section.id}
              onClick={() => goTo(section.id)}
              sx={(theme) => ({
                px: 1,
                py: 0.75,
                gap: 1,
                borderRadius: 1,
                justifyContent: 'flex-start',
                textAlign: 'left',
                typography: 'body2',
                color: isActive ? 'primary.main' : 'text.secondary',
                fontWeight: isActive ? 600 : 400,
                bgcolor: isActive ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08) : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              })}
            >
              <Box component="span" sx={{ width: 22, flexShrink: 0, color: 'text.disabled' }}>
                {section.number}
              </Box>
              <Box component="span" sx={{ flex: '1 1 auto' }}>
                {section.title}
              </Box>
              {read.has(section.id) && (
                <Iconify icon="eva:checkmark-fill" width={16} sx={{ color: 'success.main' }} />
              )}
            </ButtonBase>
          );
        })}
      </Stack>
    </Card>
  );

  const renderHandbook = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
        {renderContents()}
      </Grid>

      <Grid size={{ xs: 12, md: 8, lg: 9 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the handbook — e.g. late, leave, laptop, confidential…"
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
            />
            <Button
              color="inherit"
              variant="outlined"
              onClick={() =>
                setCollapsed(allCollapsed ? new Set() : new Set(POLICY_SECTIONS.map((s) => s.id)))
              }
              startIcon={
                <Iconify
                  icon={allCollapsed ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-upward-fill'}
                />
              }
              sx={{ flexShrink: 0 }}
            >
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </Button>
          </Stack>

          {term && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {sections.length
                ? `${sections.length} section${sections.length === 1 ? '' : 's'} mention “${term}”`
                : `Nothing in the handbook mentions “${term}”`}
            </Typography>
          )}

          {!!about?.ceo.message && !term && (
            <Card sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                A message from the CEO
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1, whiteSpace: 'pre-line', fontStyle: 'italic', color: 'text.secondary' }}
              >
                {about.ceo.message}
              </Typography>
              {about.ceo.name && (
                <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                  — {about.ceo.name}
                  {about.ceo.title ? `, ${about.ceo.title}` : ''}
                </Typography>
              )}
            </Card>
          )}

          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              term={term}
              // Searching always shows the matching text.
              open={!!term || !collapsed.has(section.id)}
              read={read.has(section.id)}
              onToggle={() => toggle(section.id)}
              refCallback={refFor(section.id)}
            />
          ))}

          <PolicyAcknowledgementCard
            ack={ack}
            fullName={fullName}
            sectionsRead={readCount}
            sectionsTotal={POLICY_SECTIONS.length}
          />
        </Stack>
      </Grid>
    </Grid>
  );

  return (
    <DashboardContent maxWidth="xl">
      {renderHero()}

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

      {tab === 'acks' && canSeeAcks ? <PolicyAcknowledgementsTable role={role} /> : renderHandbook()}

      {canEditAbout && about && editingAbout && (
        <AboutEditDialog about={about} open onClose={() => setEditingAbout(false)} />
      )}
    </DashboardContent>
  );
}
