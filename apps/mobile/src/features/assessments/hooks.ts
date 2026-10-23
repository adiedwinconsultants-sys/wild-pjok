import type {
  AssessmentInput,
  AssessmentResult,
  AssessmentScore,
  AssessmentStatus,
  Instrument,
  ScoreCategory,
  ScoreInput,
  Student,
} from '@pjok/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, apiRequestPaginated } from '../../lib/api'

export type AssessmentListItem = {
  id: string
  classId: string
  className: string
  instrumentId: string
  instrumentSlug: string
  instrumentName: string
  group: string
  date: string
  status: AssessmentStatus
  finalizedAt: string | null
  reopenedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AssessmentDetail = {
  id: string
  teacherId: string
  classId: string
  instrumentId: string
  date: string
  status: AssessmentStatus
  finalizedAt: string | null
  reopenedAt: string | null
  createdAt: string
  updatedAt: string
  instrument: Instrument
  participantIds: string[]
  participants: Student[]
  scores: AssessmentScore[]
  results: AssessmentResult[]
}

export type ScorePreview = {
  studentId: string
  finalScore: number | null
  category: ScoreCategory | null
  categoryLabel: string | null
  processScore: number | null
  productScore: number | null
  complete: boolean
}

export type ResultItem = {
  resultId: string
  studentId: string
  fullName: string
  nis: string
  processScore: number | null
  productScore: number | null
  finalScore: number
  category: ScoreCategory
  categoryLabel: string
  feedback: string | null
  computedAt: string
  scores: Array<{
    indicatorId: string
    indicatorName: string
    unit: string
    kind: 'process' | 'product'
    rawValue: number
    normalizedValue: number
  }>
}

export type ResultsResponse = {
  assessmentId: string
  instrument: Instrument
  results: ResultItem[]
}

export type AssessmentFilters = {
  classId?: string
  instrumentId?: string
  status?: AssessmentStatus
  from?: string
  to?: string
  q?: string
  page?: number
}

export function useAssessments(filters: AssessmentFilters = {}) {
  const params = new URLSearchParams({ perPage: '50', page: String(filters.page ?? 1) })
  if (filters.classId) params.set('classId', filters.classId)
  if (filters.instrumentId) params.set('instrumentId', filters.instrumentId)
  if (filters.status) params.set('status', filters.status)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.q) params.set('q', filters.q)
  return useQuery({
    queryKey: ['assessments', filters],
    queryFn: () => apiRequestPaginated<AssessmentListItem>(`/assessments?${params.toString()}`),
  })
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: ['assessment', id],
    queryFn: () => apiRequest<AssessmentDetail>(`/assessments/${id}`),
    enabled: Boolean(id),
  })
}

export function useAssessmentResults(id: string) {
  return useQuery({
    queryKey: ['assessment-results', id],
    queryFn: () => apiRequest<ResultsResponse>(`/assessments/${id}/results`),
    enabled: Boolean(id),
  })
}

export function useCreateAssessment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AssessmentInput) =>
      apiRequest<AssessmentDetail>('/assessments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['assessments'] }),
  })
}

export function useSaveScores(assessmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (scores: ScoreInput[]) =>
      apiRequest<{ updated: number; preview: ScorePreview[] }>(
        `/assessments/${assessmentId}/scores`,
        { method: 'PUT', body: JSON.stringify({ scores }) },
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['assessment', assessmentId] })
    },
  })
}

export function useFinalizeAssessment(assessmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ status: 'finalized'; finalizedAt: string; results: AssessmentResult[] }>(
        `/assessments/${assessmentId}/finalize`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['assessment', assessmentId] })
      void client.invalidateQueries({ queryKey: ['assessment-results', assessmentId] })
      void client.invalidateQueries({ queryKey: ['assessments'] })
      void client.invalidateQueries({ queryKey: ['recap'] })
    },
  })
}

export function useReopenAssessment(assessmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      apiRequest<{ id: string; status: 'reopened' }>(`/assessments/${assessmentId}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['assessment', assessmentId] })
      void client.invalidateQueries({ queryKey: ['assessment-results', assessmentId] })
      void client.invalidateQueries({ queryKey: ['assessments'] })
    },
  })
}

export function useSaveFeedback(assessmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ resultId, note }: { resultId: string; note: string }) =>
      apiRequest<{ resultId: string; note: string }>(`/results/${resultId}/feedback`, {
        method: 'PUT',
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['assessment-results', assessmentId] }),
  })
}

export type ExportJob = {
  id: string
  format: 'xlsx' | 'pdf'
  status: 'processing' | 'completed' | 'failed'
  fileName?: string
  downloadUrl: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export function useCreateExport() {
  return useMutation({
    mutationFn: (input: { assessmentId: string; format: 'xlsx' | 'pdf' }) =>
      apiRequest<ExportJob>('/exports', { method: 'POST', body: JSON.stringify(input) }),
  })
}

export function useExportJob(jobId: string | null) {
  return useQuery({
    queryKey: ['export', jobId],
    queryFn: () => apiRequest<ExportJob>(`/exports/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 1000 : false),
  })
}
