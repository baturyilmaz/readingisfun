import { useCallback, useEffect, useRef, useState } from 'react'

export function useNotes(bookId: string, chapterNumber: number | null) {
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const currentRef = useRef({ bookId, chapterNumber })
  useEffect(() => {
    currentRef.current = { bookId, chapterNumber }
  }, [bookId, chapterNumber])

  useEffect(() => {
    if (!chapterNumber) {
      setContent('') // eslint-disable-line react-hooks/set-state-in-effect
      setLoaded(true)
      return
    }
    setLoaded(false)
    const ac = new AbortController()
    fetch(`/api/books/${bookId}/notes/${chapterNumber}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d: { content: string }) => {
        setContent(d.content)
        setLoaded(true)
      })
      .catch(() => {})
    return () => ac.abort()
  }, [bookId, chapterNumber])

  const save = useCallback((text: string) => {
    const { bookId: bid, chapterNumber: num } = currentRef.current
    if (!num) return
    setSaving(true)
    fetch(`/api/books/${bid}/notes/${num}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    }).finally(() => setSaving(false))
  }, [])

  const update = useCallback(
    (text: string) => {
      setContent(text)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => save(text), 800)
    },
    [save],
  )

  const flush = useCallback(() => {
    clearTimeout(timerRef.current)
    save(content)
  }, [save, content])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { content, update, flush, saving, loaded }
}
