import { useCallback, useEffect, useRef, useState } from 'react'

export type Highlight = {
  id: string
  text: string
  createdAt: string
}

export function useHighlights(bookId: string, chapterNumber: number | null) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const saveRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!chapterNumber) {
      setHighlights([]) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    const ac = new AbortController()
    fetch(`/api/books/${bookId}/highlights/${chapterNumber}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d: { highlights: Highlight[] }) => setHighlights(d.highlights ?? []))
      .catch(() => {})
    return () => ac.abort()
  }, [bookId, chapterNumber])

  const persist = useCallback(
    (items: Highlight[]) => {
      if (!chapterNumber) return
      clearTimeout(saveRef.current)
      saveRef.current = setTimeout(() => {
        fetch(`/api/books/${bookId}/highlights/${chapterNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ highlights: items }),
        }).catch(() => {})
      }, 300)
    },
    [bookId, chapterNumber],
  )

  const addHighlight = useCallback(
    (text: string) => {
      const h: Highlight = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }
      setHighlights((prev) => {
        if (prev.some((p) => p.text === text)) return prev
        const next = [...prev, h]
        persist(next)
        return next
      })
    },
    [persist],
  )

  const removeHighlight = useCallback(
    (id: string) => {
      setHighlights((prev) => {
        const next = prev.filter((h) => h.id !== id)
        persist(next)
        return next
      })
    },
    [persist],
  )

  useEffect(() => () => clearTimeout(saveRef.current), [])

  return { highlights, addHighlight, removeHighlight }
}
