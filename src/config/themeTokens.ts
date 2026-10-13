/**
 * AeroDAG Design System Tokens (Phase 4 Redesign)
 * Light, calm, readable, consumer-friendly token dictionary.
 */

export const THEME_TOKENS = {
  colors: {
    background: '#F5F6F3',
    surface: '#FFFFFF',
    border: '#E2E6E1',
    borderStrong: '#D5DBD5',
    ink: '#15201D',
    muted: '#55625E',
    mutedDark: '#4A5753',
    accent: '#0E6B59',
    accentHover: '#0A5546',
    accentSoft: '#E3F1EC',
    warningText: '#8A4307',
    warningBg: '#FCEFD9',
    infoText: '#1E4F8A',
    infoBg: '#E4EDF8',
    focusRing: '#7CC4B3'
  },
  fonts: {
    heading: "'Bricolage Grotesque', sans-serif",
    body: "'Figtree', sans-serif"
  },
  radius: {
    card: '18px',
    button: '12px',
    pill: '999px'
  }
} as const;
