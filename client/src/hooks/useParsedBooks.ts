import { useCallback, useEffect, useState } from 'react'

type ParsedBook = {
  bookId: string
  bookTitle: string
  bookAuthor: string
  coverImage: string | null
  totalChapters: number
  parsedAt: string
}

type BookProgress = { percentage: number; lastLocation: string | null }

export function useParsedBooks() {
  const [books, setBooks] = useState<ParsedBook[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, BookProgress>>({})

  useEffect(() => {
    fetch('/api/books')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load books')
        return r.json()
      })
      .then(async (data: { books: ParsedBook[] }) => {
        setBooks(data.books)
        const entries = await Promise.all(
          data.books.map(async (b) => {
            try {
              const r = await fetch(`/api/books/${b.bookId}/progress`)
              const p = (await r.json()) as BookProgress
              return [b.bookId, p] as const
            } catch {
              return [b.bookId, { percentage: 0, lastLocation: null }] as const
            }
          }),
        )
        setProgress(Object.fromEntries(entries))
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  const deleteBook = useCallback(async (bookId: string) => {
    await fetch(`/api/books/${bookId}`, { method: 'DELETE' })
    setBooks((prev) => prev.filter((b) => b.bookId !== bookId))
  }, [])

  return { books, error, progress, deleteBook }
}
