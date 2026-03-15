import { useCallback, useEffect, useRef, useState } from 'react'
import { chatEventStore } from '../stores/chatEventStore'

export type ChatSessionSummary = {
  id: string
  chapterNumber: number
  title: string
  createdAt: string
  updatedAt: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

export function useChat(bookId: string, chapterNumber: number | null) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Reset and load sessions when chapter changes, auto-open most recent
  useEffect(() => {
    setActiveSessionId(null)
    setMessages([])
    chatEventStore.clear()
    if (!chapterNumber) {
      setSessions([])
      return
    }
    fetch(`/api/books/${bookId}/chat/sessions?chapter=${chapterNumber}`)
      .then((r) => r.json())
      .then((d: { sessions: ChatSessionSummary[] }) => {
        const sorted = d.sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        setSessions(sorted)
        if (sorted.length > 0) setActiveSessionId(sorted[0].id)
      })
      .catch(() => {})
  }, [bookId, chapterNumber])

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([])
      return
    }
    fetch(`/api/books/${bookId}/chat/sessions/${activeSessionId}/history?chapter=${chapterNumber}`)
      .then((r) => r.json())
      .then((d: { messages: unknown[] }) => {
        setMessages(extractMessages(d.messages))
      })
      .catch(() => {})
  }, [bookId, activeSessionId, chapterNumber])

  const createSession = useCallback(
    async (provider: string, model: string) => {
      if (!chapterNumber) return
      const res = await fetch(`/api/books/${bookId}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterNumber, provider, model }),
      })
      const session = (await res.json()) as ChatSessionSummary
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
    },
    [bookId, chapterNumber],
  )

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id)
  }, [])

  const deleteSession = useCallback(
    async (id: string) => {
      await fetch(`/api/books/${bookId}/chat/sessions/${id}?chapter=${chapterNumber}`, {
        method: 'DELETE',
      })
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (activeSessionId === id) {
        setActiveSessionId(null)
        setMessages([])
      }
    },
    [bookId, chapterNumber, activeSessionId],
  )

  const sendMessage = useCallback(
    async (content: string, provider: string, model: string, webSearch?: boolean) => {
      if (!activeSessionId || streaming) return

      setMessages((prev) => [...prev, { role: 'user', text: content }])
      setStreaming(true)
      chatEventStore.clear()

      let assistantText = ''

      try {
        const res = await fetch(`/api/books/${bookId}/chat/sessions/${activeSessionId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, provider, model, chapterNumber, webSearch }),
        })

        const reader = res.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          let eventType = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7)
            } else if (line.startsWith('data: ') && eventType) {
              try {
                const data = JSON.parse(line.slice(6))
                chatEventStore.push(data)
                if (eventType === 'token') {
                  assistantText += data.text
                  const text = assistantText
                  setMessages((prev) => {
                    const last = prev[prev.length - 1]
                    if (last?.role === 'assistant') {
                      return [...prev.slice(0, -1), { role: 'assistant', text }]
                    }
                    return [...prev, { role: 'assistant', text }]
                  })
                } else if (eventType === 'error') {
                  const errText = `Error: ${data.message ?? 'Chat failed'}`
                  setMessages((prev) => [...prev, { role: 'assistant', text: errText }])
                }
              } catch {
                /* skip parse errors */
              }
              eventType = ''
            }
          }
        }
      } catch {
        /* network error */
      } finally {
        setStreaming(false)
        if (chapterNumber) {
          fetch(`/api/books/${bookId}/chat/sessions?chapter=${chapterNumber}`)
            .then((r) => r.json())
            .then((d: { sessions: ChatSessionSummary[] }) =>
              setSessions(d.sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
            )
            .catch(() => {})
        }
      }
    },
    [bookId, activeSessionId, streaming, chapterNumber],
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    sessions,
    activeSessionId,
    messages,
    streaming,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
    stopStreaming,
  }
}

/** Extract user/assistant text messages from agent message format */
function extractMessages(agentMessages: unknown[]): ChatMessage[] {
  const result: ChatMessage[] = []
  for (const m of agentMessages) {
    const msg = m as { role: string; content: unknown }
    if (msg.role !== 'user' && msg.role !== 'assistant') continue
    const text = extractText(msg.content)
    if (text) result.push({ role: msg.role, text })
  }
  return result
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as { type: string; text?: string }[])
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text!)
      .join('')
  }
  return ''
}
