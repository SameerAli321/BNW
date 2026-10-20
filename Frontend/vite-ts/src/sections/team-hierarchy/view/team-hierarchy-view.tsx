import type { Company, IHierarchyNode } from 'src/types/user';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { useGetAbout } from 'src/actions/about';
import { DashboardContent } from 'src/layouts/dashboard';
import { avatarSrc, useGetHierarchy } from 'src/actions/users';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { OrganizationalChart } from 'src/components/organizational-chart';

import { useAuthContext } from 'src/auth/hooks';

import { userRoleLabel } from 'src/types/user';

import { HierarchyProfileDrawer } from '../hierarchy-profile-drawer';
import {
  COMPANY_META,
  HierarchyCeoCard,
  HierarchyNodeCard,
  HierarchyCompanyBand,
  HierarchyDepartmentBand,
} from '../hierarchy-node-card';

// ----------------------------------------------------------------------

const COMPANIES: Company[] = ['BNW', 'HAYES', 'SHARED'];
const DEFAULT_COMPANY_NAME = 'BNW Consultants (SMC-Private) Limited';

/** One box on the chart: the CEO at the top, a company band, a department band or a person. */
type ChartItem =
  | { kind: 'root'; name: string; ceos: IHierarchyNode[]; children: ChartItem[] }
  | { kind: 'band'; name: string; company: Company; count: number; children: ChartItem[] }
  | { kind: 'dept'; name: string; company: Company; children: ChartItem[] }
  | { kind: 'person'; name: string; person: IHierarchyNode; below: number; children: ChartItem[] };

const countPeople = (items: ChartItem[]): number =>
  items.reduce(
    (total, item) => total + (item.kind === 'person' ? 1 : 0) + countPeople(item.children),
    0
  );

/**
 * A company's reporting tree, from managerId within that company (someone reporting to the CEO or
 * to another company is a root). When a group of reports is in a different department from their
 * manager, they sit under a department band — so "PERSONALISED" appears under the manager it
 * reports to, as on the client's chart. The shared HR / Administration team has no department
 * bands. Guards against manager loops.
 */
function buildCompanyTree(members: IHierarchyNode[], useDepartments: boolean): ChartItem[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const childrenOf = new Map<number, IHierarchyNode[]>();
  const roots: IHierarchyNode[] = [];
  members.forEach((m) => {
    const parent = m.managerId !== null ? byId.get(m.managerId) : undefined;
    if (parent && parent.id !== m.id) {
      childrenOf.set(parent.id, [...(childrenOf.get(parent.id) ?? []), m]);
    } else roots.push(m);
  });

  const placed = new Set<number>();

  const personItem = (person: IHierarchyNode): ChartItem => {
    placed.add(person.id);
    const kids = (childrenOf.get(person.id) ?? []).filter((k) => !placed.has(k.id));
    const children = group(kids, person.departmentName);
    return { kind: 'person', name: person.name, person, below: countPeople(children), children };
  };

  function group(people: IHierarchyNode[], parentDept: string | null): ChartItem[] {
    const sorted = [...people].sort(
      (a, b) =>
        (childrenOf.get(b.id)?.length ?? 0) - (childrenOf.get(a.id)?.length ?? 0) ||
        a.name.localeCompare(b.name)
    );
    if (!useDepartments) return sorted.map(personItem);
    const same = sorted.filter((p) => !p.departmentName || p.departmentName === parentDept);
    const byDept = new Map<string, IHierarchyNode[]>();
    sorted
      .filter((p) => p.departmentName && p.departmentName !== parentDept)
      .forEach((p) => byDept.set(p.departmentName!, [...(byDept.get(p.departmentName!) ?? []), p]));
    // A band only helps to tell groups apart — when everyone here is in one department, skip it.
    if (!same.length && byDept.size === 1) return sorted.map(personItem);
    return [
      ...same.map(personItem),
      ...[...byDept.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, deptPeople]): ChartItem => ({
          kind: 'dept',
          name,
          company: deptPeople[0].company,
          children: deptPeople.map(personItem),
        })),
    ];
  }

  const items = group(roots, null);
  // Anyone left over sits in a manager loop (A → B → A) — show them at the top of the company.
  const leftovers = members.filter((m) => !placed.has(m.id));
  return [...items, ...leftovers.filter((m) => !placed.has(m.id)).map(personItem)];
}

// ----------------------------------------------------------------------

/**
 * Team Hierarchy — the company org chart: the CEO and the company at the top, then a band per
 * company (BNW, Hayes, and the HR / Administration team shared by both), each with its managers,
 * team leads and members following who reports to whom, and photos on every card. Visible to
 * everyone: GET /users/hierarchy only returns basic, non-sensitive fields.
 */
export function TeamHierarchyView() {
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';
  const currentUserId: number | undefined = currentAuthUser?.id;
  const isHrOrAdmin = currentRole === 'HR' || currentRole === 'ADMIN';

  const { people, peopleLoading, peopleError } = useGetHierarchy();
  const { about } = useGetAbout();
  const companyName = about?.company.name || DEFAULT_COMPANY_NAME;

  const [companyFilter, setCompanyFilter] = useState<Company | ''>('');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const ceos = useMemo(() => people.filter((p) => p.role === 'CEO'), [people]);

  const counts = useMemo(() => {
    const result: Record<Company, number> = { BNW: 0, HAYES: 0, SHARED: 0 };
    people.filter((p) => p.role !== 'CEO').forEach((p) => (result[p.company] += 1));
    return result;
  }, [people]);

  const root = useMemo((): ChartItem => {
    const bands = COMPANIES.filter((c) => !companyFilter || c === companyFilter).map(
      (company): ChartItem => {
        const members = people.filter((p) => p.role !== 'CEO' && p.company === company);
        return {
          kind: 'band',
          name: company,
          company,
          count: members.length,
          children: buildCompanyTree(members, company !== 'SHARED'),
        };
      }
    );
    return { kind: 'root', name: 'root', ceos, children: bands };
  }, [people, ceos, companyFilter]);

  /**
   * Shrinks the chart to fit the screen width (never above 100%). The automatic fit on load stops
   * at 80% so names stay readable — scroll sideways for the rest; the Fit button goes further.
   */
  const fitToScreen = useCallback(
    (minZoom = 0.4) => {
      const viewport = viewportRef.current;
      const chart = chartRef.current;
      if (!viewport || !chart) return;
      const natural = chart.scrollWidth / zoom;
      const next = Math.min(1, Math.max(minZoom, (viewport.clientWidth - 32) / natural));
      setZoom(Math.round(next * 100) / 100);
    },
    [zoom]
  );

  // Fit once the chart has loaded, so the whole company is visible at a glance.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || peopleLoading || !people.length) return undefined;
    fitted.current = true;
    const frame = requestAnimationFrame(() => fitToScreen(0.8));
    return () => cancelAnimationFrame(frame);
  }, [peopleLoading, people.length, fitToScreen]);

  // Scroll the searched person into view once their card is on screen.
  useEffect(() => {
    if (highlightedId === null) return undefined;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`hierarchy-node-${highlightedId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightedId, companyFilter]);

  const showPerson = (person: IHierarchyNode | null) => {
    setHighlightedId(person?.id ?? null);
    if (person && companyFilter && person.role !== 'CEO' && person.company !== companyFilter) {
      setCompanyFilter('');
    }
  };

  const handleSelectPerson = (id: number) => {
    showPerson(byId.get(id) ?? null);
    setOpenId(id);
  };

  const openPerson = openId !== null ? (byId.get(openId) ?? null) : null;

  const renderItem = (item: ChartItem) => {
    switch (item.kind) {
      case 'root':
        return (
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ display: 'inline-flex' }}>
            {item.ceos.length ? (
              item.ceos.map((ceo) => (
                <HierarchyCeoCard
                  key={ceo.id}
                  person={ceo}
                  companyName={companyName}
                  onClick={() => setOpenId(ceo.id)}
                />
              ))
            ) : (
              <Box sx={{ px: 3, py: 2, borderRadius: 1.5, color: 'common.white', bgcolor: '#1B3350' }}>
                <Typography variant="subtitle1">{companyName}</Typography>
              </Box>
            )}
          </Stack>
        );
      case 'band':
        return <HierarchyCompanyBand company={item.company} count={item.count} />;
      case 'dept':
        return <HierarchyDepartmentBand name={item.name} company={item.company} />;
      case 'person':
      default:
        return (
          <HierarchyNodeCard
            person={item.person}
            isMe={item.person.id === currentUserId}
            highlighted={item.person.id === highlightedId}
            totalReports={item.below}
            onClick={() => setOpenId(item.person.id)}
          />
        );
    }
  };

  const renderToolbar = () => (
    <Stack spacing={2} sx={{ p: 2.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <Autocomplete
          sx={{ flexGrow: 1 }}
          options={people}
          value={highlightedId !== null ? (byId.get(highlightedId) ?? null) : null}
          onChange={(event, person) => showPerson(person)}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterOptions={(options, { inputValue }) => {
            const q = inputValue.trim().toLowerCase();
            return q
              ? options.filter((o) =>
                  [o.name, o.designation, o.departmentName, userRoleLabel(o.role)]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(q))
                )
              : options;
          }}
          renderOption={({ key, ...props }, option) => (
            <li key={key} {...props}>
              <Box
                component="img"
                alt=""
                src={avatarSrc(option.avatarUrl)}
                sx={{
                  width: 24,
                  height: 24,
                  mr: 1.5,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: 'background.neutral',
                  ...(!option.avatarUrl && { visibility: 'hidden' }),
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {option.name}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                  {[option.designation, option.departmentName].filter(Boolean).join(' · ') ||
                    userRoleLabel(option.role)}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Find a person…"
              slotProps={{
                input: {
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        />

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <Tooltip title="Zoom out">
            <IconButton onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}>
              <Iconify icon="eva:minus-circle-fill" />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" sx={{ width: 44, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <Tooltip title="Zoom in">
            <IconButton onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}>
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>
          <Button size="small" color="inherit" variant="outlined" onClick={() => fitToScreen()}>
            Fit
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label={`Everyone ${people.length}`}
          color={companyFilter === '' ? 'primary' : 'default'}
          variant={companyFilter === '' ? 'filled' : 'outlined'}
          onClick={() => setCompanyFilter('')}
        />
        {COMPANIES.map((company) => {
          const selected = companyFilter === company;
          const { color } = COMPANY_META[company];
          return (
            <Chip
              key={company}
              label={`${company === 'SHARED' ? 'HR / Administration' : company === 'HAYES' ? 'Hayes' : 'BNW'} ${counts[company]}`}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => setCompanyFilter(selected ? '' : company)}
              sx={{
                ...(selected
                  ? { color: 'common.white', bgcolor: color, '&:hover': { bgcolor: color } }
                  : { borderColor: color, color }),
              }}
            />
          );
        })}
      </Stack>
    </Stack>
  );

  return (
    <DashboardContent maxWidth={false}>
      <CustomBreadcrumbs
        heading="Team Hierarchy"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Team Hierarchy' }]}
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <Card sx={{ mb: 3 }}>{renderToolbar()}</Card>

      {isHrOrAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Each person&apos;s place comes from their profile: <strong>Company</strong>,{' '}
          <strong>Department</strong> and <strong>Reporting manager</strong> (Users → Edit). Click
          anyone&apos;s card to upload their photo.
        </Alert>
      )}

      {peopleLoading && <LoadingScreen />}

      {!peopleLoading && peopleError && (
        <EmptyContent filled title="Unable to load the team hierarchy" sx={{ py: 10 }} />
      )}

      {!peopleLoading && !peopleError && !people.length && (
        <EmptyContent filled title="Nobody to show" sx={{ py: 10 }} />
      )}

      {!peopleLoading && !peopleError && !!people.length && (
        // Scrolls on its own so a wide chart never widens the page; zoom shrinks it to fit.
        <Card ref={viewportRef} sx={{ overflow: 'auto', py: 4, px: 2, maxHeight: 'calc(100vh - 160px)' }}>
          <Box ref={chartRef} sx={{ zoom, minWidth: 'max-content', mx: 'auto', width: 'fit-content' }}>
            <OrganizationalChart
              data={root}
              lineHeight="36px"
              lineWidth="1.5px"
              nodePadding="10px"
              lineBorderRadius="0px"
              nodeItem={(item: ChartItem) => renderItem(item)}
            />
          </Box>
        </Card>
      )}

      <HierarchyProfileDrawer
        person={openPerson}
        manager={openPerson?.managerId ? (byId.get(openPerson.managerId) ?? null) : null}
        reports={openPerson ? people.filter((p) => p.managerId === openPerson.id) : []}
        currentUserId={currentUserId}
        currentRole={currentRole}
        onClose={() => setOpenId(null)}
        onSelectPerson={handleSelectPerson}
      />
    </DashboardContent>
  );
}
