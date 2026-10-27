import { m, useReducedMotion } from 'framer-motion';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

const DEFAULT_TEXT = 'About us';

/**
 * The About us banner's heading: the letters rise in one by one, then a soft shine sweeps across
 * the words every few seconds. Respects "reduce motion" (shows the plain text).
 */
export function AnimatedAboutHeading({ text: TEXT = DEFAULT_TEXT }: { text?: string } = {}) {
  const reduceMotion = useReducedMotion();

  return (
    <Box
      component="h1"
      aria-label={TEXT}
      sx={(theme) => ({
        m: 0,
        position: 'relative',
        display: 'inline-block',
        // The plain body font (not the heading display font), medium weight — simple and clean.
        fontFamily: theme.typography.fontFamily,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: { xs: 34, sm: 40, md: 48 },
      })}
    >
      {/* Clips the shine to the words, so it never shows as a block beside them. */}
      <Box
        component="span"
        sx={{
          position: 'relative',
          display: 'inline-block',
          overflow: 'hidden',
          verticalAlign: 'bottom',
        }}
      >
        {TEXT.split('').map((char, i) => (
          <m.span
            key={i}
            aria-hidden
            style={{ display: 'inline-block', whiteSpace: 'pre' }}
            initial={reduceMotion ? false : { opacity: 0, y: 40, rotateX: -80 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 18 }}
          >
            {char}
          </m.span>
        ))}

        {/* Shine sweeping across the text. */}
        {!reduceMotion && (
          <Box
            component={m.span}
            aria-hidden
            initial={{ x: '-120%' }}
            animate={{ x: '220%' }}
            transition={{
              delay: 1.1,
              duration: 1.6,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 3.5,
            }}
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              width: '35%',
              position: 'absolute',
              pointerEvents: 'none',
              mixBlendMode: 'overlay',
              background:
                'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)',
            }}
          />
        )}
      </Box>

      {/* Underline that draws itself in after the letters. */}
      <Box
        component={m.span}
        aria-hidden
        initial={reduceMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15 + TEXT.length * 0.07, duration: 0.6, ease: 'easeOut' }}
        sx={{
          left: 0,
          right: 0,
          height: 4,
          bottom: -8,
          borderRadius: 2,
          position: 'absolute',
          transformOrigin: 'left',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.15))',
        }}
      />
    </Box>
  );
}

/** Soft circles drifting behind the banner content. */
export function AnimatedAboutBackdrop() {
  const reduceMotion = useReducedMotion();
  const bubbles = [
    { size: 220, top: -80, right: '8%', duration: 9 },
    { size: 140, bottom: -60, right: '28%', duration: 11 },
    { size: 90, top: 24, right: '42%', duration: 7 },
  ];

  return (
    <>
      {bubbles.map((b, i) => (
        <Box
          key={i}
          component={m.div}
          aria-hidden
          animate={
            reduceMotion ? undefined : { y: [0, -18, 0], x: [0, 10, 0], scale: [1, 1.06, 1] }
          }
          transition={{ duration: b.duration, repeat: Infinity, ease: 'easeInOut' }}
          sx={{
            top: b.top,
            right: b.right,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            position: 'absolute',
            pointerEvents: 'none',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%)',
          }}
        />
      ))}
    </>
  );
}
