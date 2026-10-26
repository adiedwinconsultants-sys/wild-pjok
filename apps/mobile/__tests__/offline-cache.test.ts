import AsyncStorage from '@react-native-async-storage/async-storage'
import { ApiError } from '../src/lib/api'
import {
  clearOfflineCache,
  fetchWithOfflineCache,
  readOfflineCache,
  setOfflineCacheOwner,
  writeOfflineCache,
} from '../src/lib/offline-cache'

type InstrumentPayload = { data: Array<{ id: string }> }

describe('offline cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    setOfflineCacheOwner('teacher-a')
  })

  it('menyimpan hasil sukses dan memakainya saat jaringan gagal', async () => {
    const online = await fetchWithOfflineCache<InstrumentPayload>('instruments', async () => ({
      data: [{ id: 'i-1' }],
    }))

    expect(online.offline).toBeNull()
    expect((await readOfflineCache<InstrumentPayload>('instruments'))?.data).toEqual({
      data: [{ id: 'i-1' }],
    })

    const offline = await fetchWithOfflineCache<InstrumentPayload>('instruments', async () => {
      throw new ApiError(0, 'NETWORK_ERROR', 'Tidak dapat terhubung ke server.')
    })

    expect(offline.data).toEqual([{ id: 'i-1' }])
    expect(offline.offline?.cachedAt).toBeTruthy()
  })

  it('meneruskan error non-jaringan tanpa memakai cache', async () => {
    await fetchWithOfflineCache('recap:c-1', async () => ({ average: 80 }))

    await expect(
      fetchWithOfflineCache('recap:c-1', async () => {
        throw new ApiError(403, 'FORBIDDEN', 'Tidak berhak.')
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('meneruskan error jaringan bila cache belum ada', async () => {
    await expect(
      fetchWithOfflineCache('recap:c-2', async () => {
        throw new ApiError(0, 'NETWORK_ERROR', 'Tidak dapat terhubung ke server.')
      }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })

  it('membersihkan seluruh cache offline', async () => {
    await fetchWithOfflineCache('instruments', async () => ({ data: [] }))
    await fetchWithOfflineCache('recap:c-1', async () => ({ average: 80 }))

    await clearOfflineCache()

    expect(await readOfflineCache('instruments')).toBeNull()
    expect(await readOfflineCache('recap:c-1')).toBeNull()
  })
  it('isole cache dan draf antar akun serta menghapus draf lama saat keluar', async () => {
    await writeOfflineCache('students:class-1', { data: [{ fullName: 'Data Uji' }] })
    await writeOfflineCache('draft:assessment-1', { score: '80' })
    await AsyncStorage.setItem('pjok.draft.legacy', '80')
    setOfflineCacheOwner('teacher-b')
    expect(await readOfflineCache('students:class-1')).toBeNull()
    expect(await readOfflineCache('draft:assessment-1')).toBeNull()
    await clearOfflineCache()
    expect(await AsyncStorage.getAllKeys()).toEqual([])
  })

  it('respons terlambat setelah pergantian akun tidak mengisi cache akun baru', async () => {
    let finish: ((value: { data: string[] }) => void) | undefined
    const pending = new Promise<{ data: string[] }>((resolve) => {
      finish = resolve
    })
    const request = fetchWithOfflineCache('students:class-1', () => pending)
    setOfflineCacheOwner('teacher-b')
    finish?.({ data: ['data-akun-lama'] })
    await request
    expect(await readOfflineCache('students:class-1')).toBeNull()
  })
})
