import {
  apiRequest,
  apiRequestPaginated,
  clearSession,
  getAccessToken,
  persistSession,
} from '../src/lib/api'

jest.mock('../src/lib/env', () => ({ env: { apiUrl: 'https://api.example.test/v1' } }))

function response(status: number, data: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response
}

describe('sesi client API', () => {
  beforeEach(async () => {
    await clearSession()
    await persistSession({ accessToken: 'old-access', refreshToken: 'old-refresh' })
  })

  afterEach(() => jest.restoreAllMocks())

  it('berhenti setelah satu refresh pada endpoint pagination yang tetap menolak akses', async () => {
    const fetcher = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(
        response(200, { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } }),
      )
      .mockResolvedValueOnce(response(401))
    await expect(apiRequestPaginated('/classes')).rejects.toMatchObject({ status: 401 })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('respons refresh terlambat tidak menghidupkan sesi setelah logout', async () => {
    let finish: ((value: Response) => void) | undefined
    const pending = new Promise<Response>((resolve) => {
      finish = resolve
    })
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(401))
      .mockReturnValueOnce(pending)
    const request = apiRequest('/auth/me')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await clearSession()
    finish?.(response(200, { data: { accessToken: 'late-access', refreshToken: 'late-refresh' } }))
    await expect(request).rejects.toMatchObject({ status: 401 })
    expect(getAccessToken()).toBeNull()
  })

  it('kegagalan sementara refresh tidak menghapus token sesi', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(503))
    await expect(apiRequest('/auth/me')).rejects.toMatchObject({ status: 401 })
    expect(getAccessToken()).toBe('old-access')
  })
})
