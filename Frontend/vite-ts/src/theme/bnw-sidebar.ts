// ----------------------------------------------------------------------

/**
 * BNW OMS: the light, soft pastel-blue sidebar colours, in one place. Consumed by the dashboard
 * layout's nav colour vars (src/layouts/dashboard/css-vars.ts, 'integrate' case, light mode) —
 * which also covers the mobile drawer, the mini (collapsed) sidebar and the Settings / Log out
 * footer. Change a colour here, not in the components.
 */
export const bnwSidebar = {
  /** Sidebar background. */
  bg: '#EDF3FF',
  /** Right border + the divider above Settings / Log out. */
  border: '#DCE6F5',
  /** Idle menu text. */
  text: '#526A8A',
  /** Idle menu icons. */
  icon: '#647D9F',
  /** Active item pill. */
  activeBg: '#DCE8FF',
  /** Active item text and icon (= primary.main, Professional Blue). */
  activeText: '#2563EB',
  /** Hover background. */
  hoverBg: '#E4EDFC',
  /** Section headings (small, letter-spaced uppercase). */
  subheader: '#7890AF',
} as const;
