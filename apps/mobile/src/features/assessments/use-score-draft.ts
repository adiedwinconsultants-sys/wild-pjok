import type { ScoreInput } from '@pjok/shared'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../lib/api'
import { readOfflineCache, writeOfflineCache } from '../../lib/offline-cache'
import type { AssessmentDetail } from './hooks'
import { type DraftValues, restoreScoreDraft, scoreKey } from './score-draft'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useScoreDraft(
  assessmentId: string,
  assessment: AssessmentDetail | undefined,
  save: (scores: ScoreInput[]) => Promise<unknown>,
) {
  const [draft, setDraft] = useState<DraftValues>({})
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const valuesRef = useRef<DraftValues>({})
  const dirty = useRef(false)
  const activeSave = useRef<Promise<void> | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save
  const hydratedId = useRef<string | null>(null)
  const assessmentRef = useRef(assessment)
  assessmentRef.current = assessment

  useEffect(() => {
    if (!assessment || hydratedId.current === assessmentId) return
    let cancelled = false
    setReady(false)
    const load = async () => {
      const cached = await readOfflineCache<unknown>(`draft:${assessmentId}`)
      if (cancelled) return
      const restored = restoreScoreDraft(assessment, cached?.data)
      valuesRef.current = restored.values
      dirty.current = restored.dirty
      setDraft(restored.values)
      setWarning(
        restored.conflict
          ? 'Draf lokal berbeda dengan data server. Nilai server digunakan. Periksa kembali sebelum finalisasi.'
          : null,
      )
      hydratedId.current = assessmentId
      setReady(true)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [assessmentId, assessment])

  useEffect(() => {
    if (!ready) return
    void writeOfflineCache(`draft:${assessmentId}`, draft)
    if (!dirty.current) return
    const timer = setTimeout(() => {
      void persistDraft().catch(() => undefined)
    }, 800)
    return () => clearTimeout(timer)
  }, [draft, assessmentId, ready])

  async function persistDraft(): Promise<void> {
    while (activeSave.current) await activeSave.current
    if (!dirty.current) return
    if (!ready || assessmentRef.current?.status === 'finalized')
      throw new Error('Nilai belum dapat disimpan. Muat ulang asesmen.')
    const snapshot = valuesRef.current
    const scores: ScoreInput[] = []
    for (const [key, value] of Object.entries(snapshot)) {
      if (value.trim() === '') continue
      const [studentId, indicatorId] = key.split(':')
      const rawValue = Number(value)
      if (!studentId || !indicatorId || !Number.isFinite(rawValue)) {
        const message = 'Nilai harus berupa angka yang valid. Periksa kembali isian.'
        setError(message)
        setStatus('error')
        throw new Error(message)
      }
      scores.push({ studentId, indicatorId, rawValue })
    }
    if (scores.length === 0) return
    setStatus('saving')
    setError(null)
    const work = (async () => {
      try {
        await saveRef.current(scores)
        if (valuesRef.current === snapshot) dirty.current = false
        setStatus(dirty.current ? 'idle' : 'saved')
      } catch (failure) {
        setStatus('error')
        setError(errorMessage(failure))
        throw failure
      }
    })()
    activeSave.current = work
    try {
      await work
    } finally {
      if (activeSave.current === work) activeSave.current = null
    }
    if (dirty.current) await persistDraft()
  }

  function onChangeValue(studentId: string, indicatorId: string, value: string) {
    dirty.current = true
    setStatus('idle')
    const next = { ...valuesRef.current, [scoreKey(studentId, indicatorId)]: value }
    valuesRef.current = next
    setDraft(next)
  }

  return { draft, status, error, warning, ready, onChangeValue, persistDraft }
}
