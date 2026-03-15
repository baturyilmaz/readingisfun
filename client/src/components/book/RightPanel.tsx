import { useState } from 'react'
import type { Highlight } from '../../hooks/useHighlights'
import { AiTab } from './AiTab'
import { NotesTab } from './NotesTab'
import { HighlightsTab } from './HighlightsTab'
import styles from '../../routes/Book.module.css'

type Tab = 'ai' | 'notes' | 'highlights'

export function RightPanel({
  bookId,
  chapterNumber,
  highlights,
  onRemoveHighlight,
  onCollapse,
  aiPrompt,
}: {
  bookId: string
  chapterNumber: number | null
  highlights: Highlight[]
  onRemoveHighlight: (id: string) => void
  onCollapse: () => void
  aiPrompt: string | null
}) {
  const [tab, setTab] = useState<Tab>('notes')
  const [lastPrompt, setLastPrompt] = useState<string | null>(null)
  if (aiPrompt && aiPrompt !== lastPrompt) {
    setLastPrompt(aiPrompt)
    setTab('ai')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ai', label: 'AI' },
    { id: 'notes', label: 'Notes' },
    { id: 'highlights', label: `Highlights${highlights.length ? ` (${highlights.length})` : ''}` },
  ]

  return (
    <div className={styles.rightPanel}>
      <div className={styles.panelHeader}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`${styles.panelTab} ${tab === t.id ? styles.panelTabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button className={styles.panelCollapseBtn} onClick={onCollapse}>
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
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      </div>
      <div style={{ display: tab === 'ai' ? 'contents' : 'none' }}>
        <AiTab bookId={bookId} chapterNumber={chapterNumber} prefill={aiPrompt} />
      </div>
      {tab === 'notes' && <NotesTab bookId={bookId} chapterNumber={chapterNumber} />}
      {tab === 'highlights' && (
        <HighlightsTab
          highlights={highlights}
          onRemove={onRemoveHighlight}
          chapterNumber={chapterNumber}
        />
      )}
    </div>
  )
}
