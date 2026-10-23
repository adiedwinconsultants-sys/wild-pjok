import { Platform } from 'react-native'

export const colors = {
  background: '#F5F5F7',
  backgroundDeep: '#ECECF0',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F2F7',
  surfaceInk: '#1D1D1F',
  border: 'rgba(60, 60, 67, 0.16)',
  borderStrong: 'rgba(60, 60, 67, 0.28)',
  primary: '#0071E3',
  primaryPressed: '#0062C4',
  primarySoft: '#EAF2FD',
  accent: '#0071E3',
  accentPressed: '#0062C4',
  accentSoft: '#EAF2FD',
  highlight: '#34C759',
  danger: '#D70015',
  dangerSoft: '#FDECEA',
  text: '#1D1D1F',
  textMuted: '#6E6E73',
  textSubtle: '#8E8E93',
  textInverse: '#FFFFFF',
  success: '#248A3D',
  successSoft: '#E9F7EE',
  info: '#5856D6',
  infoSoft: '#EFEFFF',
  overlay: 'rgba(0, 0, 0, 0.32)',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const

const systemFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })

export const fonts = {
  display: systemFont,
  body: systemFont,
  bodyMedium: systemFont,
  bodySemiBold: systemFont,
  bodyBold: systemFont,
  mono: systemFont,
  monoStrong: systemFont,
} as const

export const typography = {
  display: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700' as const,
    letterSpacing: -1.2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.7,
  },
  heading: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.35,
  },
  subheading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  small: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.05,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: -0.2,
  },
  monoStrong: {
    fontFamily: fonts.monoStrong,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  stat: {
    fontFamily: fonts.bodyBold,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700' as const,
    letterSpacing: -1.2,
  },
} as const

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 0,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
} as const

export const touchTarget = 44
