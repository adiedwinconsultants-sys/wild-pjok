import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Platform } from 'react-native'

const mockHydrate = jest.fn()
type NavigationProps = { hidden?: boolean; style?: string }
const mockNavigationBar = jest.fn((_props: NavigationProps) => null)

jest.mock('expo-router', () => ({ Stack: () => null }))
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }))
jest.mock('expo-navigation-bar', () => ({
  NavigationBar: (props: NavigationProps) => mockNavigationBar(props),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}))
jest.mock('../src/lib/auth-store', () => ({
  useAuthStore: (selector: (state: { status: string; hydrate: typeof mockHydrate }) => unknown) =>
    selector({ status: 'loading', hydrate: mockHydrate }),
}))

import RootLayout from '../app/_layout'

describe('RootLayout', () => {
  afterEach(() => jest.restoreAllMocks())

  it('menampilkan splash selama hidrasi sesi', async () => {
    await render(<RootLayout />)

    expect(screen.getByText('PJOK Asesmen')).toBeTruthy()
    expect(mockHydrate).toHaveBeenCalled()
  })

  it('memasang kontrol navigasi sistem saat aplikasi Android dibuka', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    mockNavigationBar.mockClear()
    await render(<RootLayout />)
    expect(mockNavigationBar).toHaveBeenCalledWith({ hidden: true, style: 'dark' })
  })

  it('tidak memasang kontrol navigasi Android pada iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    mockNavigationBar.mockClear()
    await render(<RootLayout />)
    expect(mockNavigationBar).not.toHaveBeenCalled()
  })
})
