import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProviderModel } from '../../types'
import { useChat } from '../../hooks/useChat'
import { useChatEvents } from '../../stores/chatEventStore'
import { ChatMessage } from './ChatMessage'
import { ChatToolCall } from './ChatToolCall'
import styles from '../../routes/Book.module.css'

export function AiTab({
  bookId,
  chapterNumber,
  prefill,
}: {
  bookId: string
  chapterNumber: number | null
  prefill?: string | null
}) {
  const {
    sessions,
    activeSessionId,
    messages,
    streaming,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
  } = useChat(bookId, chapterNumber)
  const events = useChatEvents()
  const [input, setInput] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const inputValueRef = useRef(input)
  useEffect(() => {
    inputValueRef.current = input
  }, [input])

  const [providerId] = useState(() => localStorage.getItem('readingisfun:provider') ?? '')
  const [models, setModels] = useState<ProviderModel[]>([])
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('readingisfun:model') ?? '',
  )
  const [webSearch, setWebSearch] = useState(false)
  const webSearchAvailable = import.meta.env.VITE_WEB_SEARCH === 'true'

  const selectedModelName = models.find((m) => m.id === selectedModel)?.name

  useEffect(() => {
    if (!prefill) return
    // If there's an active session, send directly. Otherwise set as input.
    if (activeSessionId && selectedModel) {
      sendMessage(prefill, providerId, selectedModel)
    } else {
      setInput(prefill) // eslint-disable-line react-hooks/set-state-in-effect
      inputRef.current?.focus()
    }
  }, [prefill]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!providerId) return
    const ac = new AbortController()
    fetch(`/api/auth/models/${providerId}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d: { models: ProviderModel[] }) => {
        setModels(d.models)
        if (d.models.length > 0 && !localStorage.getItem('readingisfun:model')) {
          const first = d.models[0].id
          setSelectedModel(first)
          localStorage.setItem('readingisfun:model', first)
        }
      })
      .catch(() => {})
    return () => ac.abort()
  }, [providerId])

  useEffect(() => {
    if (!showModelPicker) return
    const close = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setShowModelPicker(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showModelPicker])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, events])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  const handleSend = useCallback(() => {
    const text = inputValueRef.current.trim()
    if (!text || streaming || !selectedModel) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    sendMessage(text, providerId, selectedModel, webSearch)
  }, [streaming, sendMessage, providerId, selectedModel, webSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('readingisfun:model', modelId)
    setShowModelPicker(false)
  }, [])

  const handleNewChat = useCallback(() => {
    if (!selectedModel) return
    createSession(providerId, selectedModel)
  }, [createSession, providerId, selectedModel])

  if (!chapterNumber) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyText}>Select a chapter to start chatting</span>
      </div>
    )
  }

  if (!activeSessionId) {
    return (
      <div className={styles.chatEmpty}>
        {sessions.length > 0 && (
          <div className={styles.chatSessionList}>
            {sessions.map((s) => (
              <button
                key={s.id}
                className={styles.chatSessionItem}
                onClick={() => selectSession(s.id)}
              >
                <span className={styles.chatSessionTitle}>{s.title}</span>
                <button
                  className={styles.chatSessionDelete}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(s.id)
                  }}
                >
                  &times;
                </button>
              </button>
            ))}
          </div>
        )}
        <button className={styles.chatNewBtn} onClick={handleNewChat}>
          New chat
        </button>
      </div>
    )
  }

  const toolEvents = streaming ? events.filter((e) => e.type === 'tool_start') : []

  return (
    <div className={styles.chatBody}>
      <div className={styles.chatHeader}>
        <select
          className={styles.chatSessionSelect}
          value={activeSessionId}
          onChange={(e) => {
            if (e.target.value === '__new__') handleNewChat()
            else selectSession(e.target.value)
          }}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
          <option value="__new__">+ New chat</option>
        </select>
      </div>

      <div className={styles.chatMessages} ref={listRef}>
        {messages.map((m, i) => (
          <ChatMessage key={`${m.role}-${i}`} message={m} />
        ))}
        {toolEvents.map((e, i) => (
          <ChatToolCall key={`tool-${i}`} event={e} />
        ))}
      </div>

      <div className={styles.chatInputWrap}>
        <div className={styles.chatInputBar}>
          <div className={styles.chatModelPickerWrap} ref={pickerRef}>
            <button
              className={styles.chatModelBtn}
              onClick={() => setShowModelPicker((v) => !v)}
              title={selectedModelName ?? 'Select model'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                <circle cx="9" cy="15" r="1" />
                <circle cx="15" cy="15" r="1" />
              </svg>
            </button>
            {showModelPicker && (
              <div className={styles.chatModelDropdown}>
                {models.map((m) => (
                  <button
                    key={m.id}
                    className={`${styles.chatModelOption} ${m.id === selectedModel ? styles.chatModelOptionActive : ''}`}
                    onClick={() => handleModelChange(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {webSearchAvailable && (
            <button
              className={`${styles.chatWebSearchBtn} ${webSearch ? styles.chatWebSearchBtnActive : ''}`}
              onClick={() => setWebSearch((v) => !v)}
              title={webSearch ? 'Web search enabled' : 'Enable web search'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </button>
          )}
          {selectedModelName && <span className={styles.chatModelLabel}>{selectedModelName}</span>}
        </div>
        <div className={styles.chatInput}>
          <textarea
            ref={inputRef}
            className={styles.chatTextarea}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this chapter..."
            rows={2}
            disabled={streaming}
          />
          <button
            className={styles.chatSendBtn}
            onClick={handleSend}
            disabled={!input.trim() || streaming || !selectedModel}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
