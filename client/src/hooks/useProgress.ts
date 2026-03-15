import { useCallback, useEffect, useState } from 'react'

type Progress = { percentage: number; lastLocation: string | null }

export function useProgress(bookId: string) {
  const [progress, setProgress] = useState<Progress>({ percentage: 0, lastLocation: null })

  useEffect(() => {
    fetch(`/api/books/${bookId}/progress`)
      .then((r) => r.json())
      .then((data: Progress) => setProgress(data))
      .catch(() => {})
  }, [bookId])

  const updateProgress = useCallback(
    (percentage: number, lastLocation: string | null) => {
      const next = { percentage, lastLocation }
      setProgress(next)
      fetch(`/api/books/${bookId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {})
    },
    [bookId],
  )

  return { progress, updateProgress }
}
