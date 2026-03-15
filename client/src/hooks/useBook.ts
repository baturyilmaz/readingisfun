import { useCallback, useEffect, useRef, useState } from 'react'

export type ChapterEntry = {
  number: number
  title: string
  sourceFile: string
  wordCount: number
  images: string[]
}

export type BookManifest = {
  bookId: string
  bookTitle: string
  bookAuthor: string
  language: string
  coverImage: string | null
  epubFile: string
  totalChapters: number
  parsedAt: string
  chapters: ChapterEntry[]
}

export type ChapterData = {
  number: number
  title: string
  sourceFile: string
  content: string
  formattedContent: string | null
}

type BookState = {
  manifest: BookManifest | null
  activeChapter: ChapterData | null
  activeChapterNumber: number | null
  loading: boolean
  error: string | null
}

export function useBook(bookId: string) {
  const [state, setState] = useState<BookState>({
    manifest: null,
    activeChapter: null,
    activeChapterNumber: null,
    loading: true,
    error: null,
  })
  const cache = useRef<Map<number, ChapterData>>(new Map())

  // Load manifest
  useEffect(() => {
    const ac = new AbortController()
    fetch(`/api/books/${bookId}/manifest`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Book not found')
        return r.json()
      })
      .then((manifest: BookManifest) => {
        setState((s) => ({ ...s, manifest, loading: false }))
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          setState((s) => ({ ...s, loading: false, error: err.message }))
        }
      })
    return () => ac.abort()
  }, [bookId])

  const selectChapter = useCallback(
    async (chapterNumber: number) => {
      setState((s) => ({ ...s, activeChapterNumber: chapterNumber }))

      const cached = cache.current.get(chapterNumber)
      if (cached) {
        setState((s) => ({ ...s, activeChapter: cached }))
        return
      }

      try {
        const r = await fetch(`/api/books/${bookId}/chapters/${chapterNumber}`)
        if (!r.ok) throw new Error('Chapter not found')
        const data: ChapterData = await r.json()
        cache.current.set(chapterNumber, data)
        setState((s) => {
          if (s.activeChapterNumber !== chapterNumber) return s
          return { ...s, activeChapter: data }
        })
      } catch {
        setState((s) => ({ ...s, error: 'Failed to load chapter' }))
      }
    },
    [bookId],
  )

  return { ...state, selectChapter }
}
