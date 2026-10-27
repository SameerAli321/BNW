import type { Company, IHierarchyNode } from 'src/types/user';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { avatarSrc } from 'src/actions/users';

import { userRoleLabel } from 'src/types/user';

// ----------------------------------------------------------------------
// The org chart's building blocks, in the client's chart colours: the CEO in navy, then one
// coloured band per company — BNW (blue), Hayes (teal) and the HR / Administration team shared by
// both (purple) — with department bands and people cards tinted to match their company.

export const CEO_COLOR = '#1B3350';

export const COMPANY_META: Record<Company, { title: string; subtitle?: string; color: string }> = {
  BNW: { title: 'BNW', color: '#26628F' },
  HAYES: { title: 'HAYES', color: '#267A6E' },
  SHARED: {
    title: 'HR / ADMINISTRATION — Shared across BNW & Hayes',
    subtitle: 'Reporting to the BNW CEO and Hayes Director',
    color: '#6E5287',
  },
};

const initial = (name: string) => name.charAt(0).toUpperCase();

/** Navy card at the top: the CEO and the company they lead. */
export function HierarchyCeoCard({
  person,
  companyName,
  onClick,
}: {
  person: IHierarchyNode;
  companyName: string;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      id={`hierarchy-node-${person.id}`}
      onClick={onClick}
      sx={{
        px: 2,
        py: 1.25,
        gap: 1.5,
        minWidth: 220,
        borderRadius: 1.5,
        color: 'common.white',
        bgcolor: CEO_COLOR,
        boxShadow: (theme) => theme.vars.customShadows.z8,
        '&:hover': { bgcolor: alpha(CEO_COLOR, 0.92) },
      }}
    >
      <Avatar
        alt={person.name}
        src={avatarSrc(person.avatarUrl)}
        sx={{ width: 48, height: 48, border: '2px solid rgba(255,255,255,0.6)', fontSize: 20 }}
      >
        {initial(person.name)}
      </Avatar>
      <Box sx={{ textAlign: 'left' }}>
        <Typography variant="subtitle1">{person.name}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          {person.designation || 'Chief Executive Officer'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            opacity: 0.7,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {companyName}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

/** A company band (BNW / HAYES / HR & Administration). */
export function HierarchyCompanyBand({ company, count }: { company: Company; count: number }) {
  const meta = COMPANY_META[company];
  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        minWidth: 240,
        maxWidth: 420,
        mx: 'auto',
        borderRadius: 1,
        color: 'common.white',
        bgcolor: meta.color,
        display: 'inline-block',
      }}
    >
      <Typography variant="subtitle2" sx={{ letterSpacing: 0.6 }}>
        {meta.title}
      </Typography>
      {meta.subtitle && (
        <Typography variant="caption" component="div" sx={{ opacity: 0.85 }}>
          {meta.subtitle}
        </Typography>
      )}
      <Typography variant="caption" component="div" sx={{ opacity: 0.7 }}>
        {count} {count === 1 ? 'person' : 'people'}
      </Typography>
    </Box>
  );
}

/** A department band inside a company (e.g. PERSONALISED). */
export function HierarchyDepartmentBand({ name, company }: { name: string; company: Company }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        minWidth: 160,
        borderRadius: 0.75,
        display: 'inline-block',
        color: 'common.white',
        bgcolor: alpha(COMPANY_META[company].color, 0.85),
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}
      >
        {name}
      </Typography>
    </Box>
  );
}

type PersonProps = {
  person: IHierarchyNode;
  isMe?: boolean;
  highlighted?: boolean;
  /** Number of people below this person (whole subtree). */
  totalReports?: number;
  onClick: () => void;
};

/** One person on the chart: photo, name, job title — tinted in their company's colour. */
export function HierarchyNodeCard({
  person,
  isMe,
  highlighted,
  totalReports,
  onClick,
}: PersonProps) {
  const color = COMPANY_META[person.company]?.color ?? COMPANY_META.BNW.color;
  return (
    <ButtonBase
      id={`hierarchy-node-${person.id}`}
      onClick={onClick}
      sx={(theme) => ({
        p: 1,
        width: 150,
        gap: 0.5,
        borderRadius: 1,
        flexDirection: 'column',
        position: 'relative',
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.07),
        border: `1px solid ${alpha(color, 0.35)}`,
        outline: '2px solid transparent',
        outlineOffset: 2,
        transition: theme.transitions.create(['box-shadow', 'outline-color', 'transform']),
        '&:hover': { boxShadow: theme.vars.customShadows.z8, transform: 'translateY(-2px)' },
        ...(isMe && { outlineColor: color }),
        ...(highlighted && {
          outlineColor: theme.vars.palette.warning.main,
          boxShadow: theme.vars.customShadows.z16,
        }),
      })}
    >
      {isMe && (
        <Box
          component="span"
          sx={{
            top: 6,
            right: 6,
            px: 0.75,
            borderRadius: 0.5,
            position: 'absolute',
            typography: 'caption',
            fontWeight: 700,
            color: 'common.white',
            bgcolor: color,
          }}
        >
          You
        </Box>
      )}
      <Avatar
        alt={person.name}
        src={avatarSrc(person.avatarUrl)}
        sx={{ width: 40, height: 40, border: `2px solid ${alpha(color, 0.5)}` }}
      >
        {initial(person.name)}
      </Avatar>
      <Typography variant="subtitle2" noWrap sx={{ maxWidth: 1 }}>
        {person.name}
      </Typography>
      <Typography variant="caption" noWrap sx={{ maxWidth: 1, color: 'text.secondary', mt: -0.5 }}>
        {person.designation || userRoleLabel(person.role)}
      </Typography>
      {(person.employmentType === 'INTERN' || !!totalReports) && (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {[
            person.employmentType === 'INTERN' ? 'Intern' : null,
            totalReports ? `${totalReports} below` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      )}
    </ButtonBase>
  );
}
