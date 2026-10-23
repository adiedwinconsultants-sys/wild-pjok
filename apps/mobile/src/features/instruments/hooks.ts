import type { Instrument, MaterialGroup } from '@pjok/shared'
import { useQuery } from '@tanstack/react-query'
import { apiRequest, apiRequestPaginated } from '../../lib/api'
import { type OfflineCapable, fetchWithOfflineCache } from '../../lib/offline-cache'

export type InstrumentSummary = {
  id: string
  slug: string
  version: number
  group: MaterialGroup
  name: string
  createdAt: string
}

export type InstrumentListResult = OfflineCapable<
  Awaited<ReturnType<typeof apiRequestPaginated<InstrumentSummary>>>
>

const ALL_INSTRUMENTS_CACHE_KEY = 'instruments'

function loadAllInstruments() {
  return apiRequestPaginated<InstrumentSummary>('/instruments?perPage=100')
}

export function useInstruments(filters: { group?: MaterialGroup; q?: string } = {}) {
  const term = filters.q?.trim().toLowerCase() ?? ''

  return useQuery({
    queryKey: ['instruments', filters.group ?? 'all', term],
    queryFn: () => fetchWithOfflineCache(ALL_INSTRUMENTS_CACHE_KEY, loadAllInstruments),
    select: (result): InstrumentListResult => {
      const rows = result.data.filter(
        (row) =>
          (!filters.group || row.group === filters.group) &&
          (!term || row.name.toLowerCase().includes(term)),
      )
      return {
        ...result,
        data: rows,
        meta: { ...result.meta, total: rows.length, totalPages: rows.length > 0 ? 1 : 0 },
      }
    },
    staleTime: 10 * 60_000,
  })
}

export function useInstrument(slug: string) {
  return useQuery({
    queryKey: ['instrument', slug],
    queryFn: () =>
      fetchWithOfflineCache(`instrument:${slug}`, () =>
        apiRequest<Instrument>(`/instruments/${slug}`),
      ),
    enabled: Boolean(slug),
    staleTime: 10 * 60_000,
  })
}
