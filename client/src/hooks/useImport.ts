import { useCallback, useState } from 'react'
import { parseEventStore } from '../stores/parseEventStore'

type ImportState = {
  file: File | null
  importing: boolean
  done: boolean
  bookId: string | null
  error: string | null
}

export function useImport() {
  const [state, setState] = useState<ImportState>({
    file: null,
    importing: false,
    done: false,
    bookId: null,
    error: null,
  })

  const setFile = useCallback((file: File | null) => {
    setState({ file, importing: false, done: false, bookId: null, error: null })
  }, [])

  const startImport = useCallback(async () => {
    if (!state.file) return

    setState((s) => ({ ...s, importing: true, error: null }))
    parseEventStore.clear()

    try {
      // Upload the file
      const uploadRes = await fetch('/api/parse/upload-epub', {
        method: 'POST',
        headers: { 'X-Filename': encodeURIComponent(state.file.name) },
        body: await state.file.arrayBuffer(),
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error ?? 'Upload failed')
      }

      const { filename } = await uploadRes.json()

      // Start SSE import
      const es = new EventSource(`/api/parse/import-epub?filename=${encodeURIComponent(filename)}`)

      es.addEventListener('log', (e) => {
        const data = JSON.parse((e as MessageEvent).data)
        parseEventStore.push({ type: 'log', message: data.message })
      })

      es.addEventListener('done', (e) => {
        const data = JSON.parse((e as MessageEvent).data)
        parseEventStore.push({ type: 'done' })
        setState((s) => ({ ...s, importing: false, done: true, bookId: data.bookId }))
        es.close()
      })

      es.addEventListener('error', (e) => {
        if (e instanceof MessageEvent) {
          const data = JSON.parse(e.data) as { message: string }
          setState((s) => ({ ...s, importing: false, error: data.message }))
        } else {
          setState((s) => ({ ...s, importing: false, error: 'Connection lost' }))
        }
        es.close()
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      setState((s) => ({ ...s, importing: false, error: msg }))
    }
  }, [state.file])

  return { ...state, setFile, startImport }
}
