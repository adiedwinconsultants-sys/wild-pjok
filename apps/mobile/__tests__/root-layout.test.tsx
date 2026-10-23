import { render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'

const mockHydrate = jest.fn()

jest.mock('expo-router', () => ({ Stack: () => null }))
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}))
jest.mock('../src/lib/auth-store', () => ({
  useAuthStore: (selector: (state: { status: string; hydrate: typeof mockHydrate }) => unknown) =>
    selector({ status: 'loading', hydrate: mockHydrate }),
}))

import RootLayout from '../app/_layout'

describe('RootLayout', () => {
  it('menampilkan splash selama hidrasi sesi', async () => {
    await render(<RootLayout />)

    expect(screen.getByText('PJOK Asesmen')).toBeTruthy()
    expect(mockHydrate).toHaveBeenCalled()
  })
})
