export const colors = {
  background: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2EE',
  border: '#D9E1DA',
  primary: '#0F766E',
  primaryPressed: '#0B5F59',
  primarySoft: '#D9F2EE',
  accent: '#92400E',
  accentSoft: '#FDF0DC',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  text: '#10231F',
  textMuted: '#5B6B65',
  textInverse: '#FFFFFF',
  success: '#0B6B35',
  successSoft: '#DCF3E4',
  info: '#1D4ED8',
  infoSoft: '#E3EAFD',
  overlay: 'rgba(16, 35, 31, 0.45)',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const

export const typography = {
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  heading: { fontSize: 20, fontWeight: '700' as const },
  subheading: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
} as const

export const shadow = {
  card: {
    shadowColor: '#10231F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
} as const

export const touchTarget = 48
