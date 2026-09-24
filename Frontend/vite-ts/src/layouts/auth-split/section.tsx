import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';

import { m } from 'framer-motion';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Logo } from 'src/components/logo';
import { varFade, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export type AuthSplitSectionProps = BoxProps & {
  title?: string;
  subtitle?: string;
  layoutQuery?: Breakpoint;
};

// BNW OMS: the minimal-kit's generic stock "dashboard illustration" photo + the Firebase/Amplify/
// Auth0/Supabase "switch provider" icon strip have both been replaced with something that's
// actually about this app — a big animated brand mark on a soft themed backdrop, since this app
// only ever has one sign-in method and no real product photography to show instead.
export function AuthSplitSection({
  sx,
  layoutQuery = 'md',
  title = 'Hi, welcome back',
  subtitle = 'Your HR & operations portal, all in one place.',
  ...other
}: AuthSplitSectionProps) {
  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [
              `linear-gradient(135deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.16)}, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.02)})`,
            ],
          }),
          px: 3,
          pb: 3,
          width: 1,
          maxWidth: 480,
          display: 'none',
          position: 'relative',
          overflow: 'hidden',
          pt: 'var(--layout-header-desktop-height)',
          [theme.breakpoints.up(layoutQuery)]: {
            gap: 6,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            justifyContent: 'center',
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <MotionContainer sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <m.div
          variants={varFade('inDown')}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo isSingle={false} sx={{ width: 260, height: 80 }} />
        </m.div>

        <m.div variants={varFade('inUp')}>
          <div>
            <Typography variant="h3" sx={{ textAlign: 'center' }}>
              {title}
            </Typography>

            {subtitle && (
              <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
                {subtitle}
              </Typography>
            )}
          </div>
        </m.div>
      </MotionContainer>
    </Box>
  );
}
