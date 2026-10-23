import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

const mockSignIn = jest.fn()

jest.mock('expo-router', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return {
    Link: ({ children }: { children: ReactNode }) => React.createElement(Text, null, children),
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  }
})

jest.mock('../src/lib/auth-store', () => ({
  useAuthStore: (selector: (state: { signIn: typeof mockSignIn }) => unknown) =>
    selector({ signIn: mockSignIn }),
}))

import LoginScreen from '../app/(auth)/login'

describe('LoginScreen', () => {
  beforeEach(() => {
    mockSignIn.mockReset()
  })

  it('memanggil signIn untuk input valid', async () => {
    mockSignIn.mockResolvedValue(undefined)
    await render(<LoginScreen />)

    await fireEvent.changeText(screen.getByLabelText('Email'), 'guru@sekolah.id')
    await fireEvent.changeText(screen.getByLabelText('Kata sandi'), 'password123')
    await fireEvent.press(screen.getByText('Masuk'))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'guru@sekolah.id',
        password: 'password123',
      })
    })
  })

  it('menampilkan pesan validasi untuk input tidak valid', async () => {
    await render(<LoginScreen />)

    await fireEvent.press(screen.getByText('Masuk'))

    await waitFor(() => {
      expect(screen.getByText('Format email tidak valid')).toBeTruthy()
      expect(screen.getByText('Kata sandi minimal 8 karakter')).toBeTruthy()
    })
    expect(mockSignIn).not.toHaveBeenCalled()
  })
})
