import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Pressable, Text } from 'react-native'
import { useClasses, useCreateClass, useUpdateClass } from '../src/features/classes/hooks'
import { apiRequest, apiRequestPaginated } from '../src/lib/api'
import { queryClient as appQueryClient } from '../src/lib/query-client'

jest.mock('../src/lib/api', () => ({
  apiRequest: jest.fn(),
  apiRequestPaginated: jest.fn(),
}))

function ClassesMenuProbe() {
  const classes = useClasses()
  return <Text>{classes.isLoading ? 'Memuat kelas' : 'Menu siap'}</Text>
}

function ClassMutationProbe({ action }: { action: 'create' | 'update' }) {
  const createClass = useCreateClass()
  const updateClass = useUpdateClass('class-1')
  const onPress = () => {
    if (action === 'create') {
      createClass.mutate({ name: 'VIII A', gradeLevel: 8, academicYear: '2026/2027' })
      return
    }
    updateClass.mutate({ name: 'VII B' })
  }

  return (
    <Pressable onPress={onPress}>
      <Text>{action === 'create' ? 'Tambah kelas' : 'Ubah kelas'}</Text>
    </Pressable>
  )
}

describe('cache saat kembali ke menu', () => {
  let client: QueryClient

  beforeEach(() => {
    const defaults = appQueryClient.getDefaultOptions()
    client = new QueryClient({
      defaultOptions: {
        ...defaults,
        queries: { ...defaults.queries, gcTime: Number.POSITIVE_INFINITY },
        mutations: { ...defaults.mutations, gcTime: Number.POSITIVE_INFINITY },
      },
    })
    jest.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    client.clear()
  })

  it('memakai data kelas tersimpan tanpa meminta ulang setelah cache berumur 31 detik', async () => {
    const cachedPage = {
      data: [],
      meta: { page: 1, perPage: 100, total: 0, totalPages: 0 },
      offline: null,
    }
    client.setQueryData(['classes', ''], cachedPage, {
      updatedAt: Date.now() - 31_000,
    })
    jest.mocked(apiRequestPaginated).mockResolvedValue(cachedPage)

    await render(
      <QueryClientProvider client={client}>
        <ClassesMenuProbe />
      </QueryClientProvider>,
    )

    expect(screen.getByText('Menu siap')).toBeTruthy()
    expect(apiRequestPaginated).not.toHaveBeenCalled()
  })

  it.each(['create', 'update'] as const)(
    'membatalkan cache kelas setelah mutasi %s',
    async (action) => {
      const cachedPage = {
        data: [],
        meta: { page: 1, perPage: 100, total: 0, totalPages: 0 },
        offline: null,
      }
      const cachedClass = {
        id: 'class-1',
        teacherId: 'teacher-1',
        name: 'VII A',
        gradeLevel: 7,
        academicYear: '2025/2026',
        notes: null,
        studentCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      client.setQueryData(['classes', ''], cachedPage)
      client.setQueryData(['class', 'class-1'], cachedClass)
      jest.mocked(apiRequest).mockResolvedValue(cachedClass)
      const classesQuery = client.getQueryCache().find({ queryKey: ['classes', ''] })
      const classQuery = client.getQueryCache().find({ queryKey: ['class', 'class-1'] })

      const view = await render(
        <QueryClientProvider client={client}>
          <ClassMutationProbe action={action} />
        </QueryClientProvider>,
      )
      await fireEvent.press(view.getByText(action === 'create' ? 'Tambah kelas' : 'Ubah kelas'))
      await waitFor(() => expect(classesQuery?.state.isInvalidated).toBe(true))
      if (action === 'update') {
        expect(classQuery?.state.isInvalidated).toBe(true)
      }
    },
  )
})
