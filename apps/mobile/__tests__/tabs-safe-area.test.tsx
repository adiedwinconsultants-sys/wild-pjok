import { render } from '@testing-library/react-native'
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native'

type TabsOptions = { tabBarStyle: StyleProp<ViewStyle> }
let mockOptions: TabsOptions | undefined
let mockBottomInset = 0

jest.mock('expo-router', () => {
  const Tabs = ({ screenOptions }: { screenOptions: TabsOptions }) => {
    mockOptions = screenOptions
    return null
  }
  Tabs.Screen = () => null
  return { Tabs }
})
jest.mock('@expo/vector-icons/Ionicons', () => () => null)
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: mockBottomInset, left: 0, right: 0 }),
}))

import TabsLayout from '../app/(app)/(tabs)/_layout'

describe('safe area tab aplikasi', () => {
  it.each([24, 34, 48])('menempatkan tab di atas area navigasi sistem %i dp', async (bottom) => {
    mockBottomInset = bottom
    await render(<TabsLayout />)
    const style = StyleSheet.flatten(mockOptions?.tabBarStyle)
    const padding = Number(style?.paddingBottom ?? 0)
    const contentHeight = Number(style?.height ?? 0) - padding - Number(style?.paddingTop ?? 0)
    expect(padding).toBeGreaterThanOrEqual(bottom)
    expect(contentHeight).toBeGreaterThanOrEqual(44)
  })

  it('mempertahankan ruang sentuh saat navigasi sistem tersembunyi', async () => {
    mockBottomInset = 0
    await render(<TabsLayout />)
    const style = StyleSheet.flatten(mockOptions?.tabBarStyle)
    expect(Number(style?.paddingBottom)).toBeGreaterThanOrEqual(12)
    expect(Number(style?.height)).toBeGreaterThanOrEqual(70)
  })

  it('menghitung ulang ruang tab saat bilah sistem ditampilkan dan disembunyikan', async () => {
    mockBottomInset = 48
    const { rerender } = await render(<TabsLayout />)
    expect(StyleSheet.flatten(mockOptions?.tabBarStyle)?.paddingBottom).toBe(48)
    mockBottomInset = 0
    await rerender(<TabsLayout />)
    expect(StyleSheet.flatten(mockOptions?.tabBarStyle)?.paddingBottom).toBe(12)
    mockBottomInset = 48
    await rerender(<TabsLayout />)
    expect(StyleSheet.flatten(mockOptions?.tabBarStyle)?.paddingBottom).toBe(48)
  })
})
