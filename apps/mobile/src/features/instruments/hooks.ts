import type { Instrument, MaterialGroup } from '@pjok/shared'
import { useQuery } from '@tanstack/react-query'
import { apiRequest, apiRequestPaginated } from '../../lib/api'

export type InstrumentSummary = {
  id: string
  slug: string
  version: number
  group: MaterialGroup
  name: string
  createdAt: string
}

export function useInstruments(filters: { group?: MaterialGroup; q?: string } = {}) {
  const params = new URLSearchParams({ perPage: '100' })
  if (filters.group) params.set('group', filters.group)
  if (filters.q) params.set('q', filters.q)
  return useQuery({
    queryKey: ['instruments', filters.group ?? 'all', filters.q ?? ''],
    queryFn: () => apiRequestPaginated<InstrumentSummary>(`/instruments?${params.toString()}`),
    staleTime: 10 * 60_000,
  })
}

export function useInstrument(slug: string) {
  return useQuery({
    queryKey: ['instrument', slug],
    queryFn: () => apiRequest<Instrument>(`/instruments/${slug}`),
    enabled: Boolean(slug),
    staleTime: 10 * 60_000,
  })
}
