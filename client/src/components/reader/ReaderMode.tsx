import { useCallback, useEffect, useRef, useState } from 'react'
import { ReactReader, type IReactReaderStyle, ReactReaderStyle } from 'react-reader'
import type { Rendition } from 'epubjs'
import type { Highlight } from '../../hooks/useHighlights'
import { AiTab } from '../book/AiTab'
import { NotesTab } from '../book/NotesTab'
import { HighlightsTab } from '../book/HighlightsTab'
import styles from './Reader.module.css'

type ReaderTheme = 'light' | 'sepia' | 'dark'
type PanelTab = 'ai' | 'notes' | 'highlights'

type Props = {
  bookId: string
  initialChapter: number | null
  chapterNumber: number | null
  highlights: Highlight[]
  onHighlight: (text: string) => void
  onRemoveHighlight: (id: string) => void
  onExitReader: () => void
  onProgress: (percentage: number, lastLocation: string | null) => void
  onChapterChange: (chapter: number) => void
}

const THEMES: Record<ReaderTheme, Record<string, Record<string, string>>> = {
  light: {
    body: { background: '#fafaf8', color: '#1a1a1a' },
    'a, a:link, a:visited': { color: '#c2623e' },
  },
  sepia: {
    body: { background: '#f5ecd7', color: '#3b2f1e' },
    'a, a:link, a:visited': { color: '#8b5a2b' },
  },
  dark: {
    body: { background: '#0a0a0a', color: '#d4d0c8' },
    'a, a:link, a:visited': { color: '#da7756' },
  },
}

const THEME_VARS: Record<ReaderTheme, Record<string, string>> = {
  light: { bg: '#fafaf8', text: '#1a1a1a', accent: '#c2623e', muted: '#999', surface: '#f0ede8', border: '#e0dcd6' },
  sepia: { bg: '#f5ecd7', text: '#3b2f1e', accent: '#8b5a2b', muted: '#8a7d6d', surface: '#ebe3d0', border: '#d4c9b5' },
  dark: { bg: '#0a0a0a', text: '#d4d0c8', accent: '#da7756', muted: '#666', surface: '#1a1a18', border: '#2a2a28' },
}

function ls(key: string, fallback: string): string {
  return localStorage.getItem(`readingisfun:reader-${key}`) ?? fallback
}
function lsSet(key: string, val: string) {
  localStorage.setItem(`readingisfun:reader-${key}`, val)
}

export function ReaderMode({
  bookId,
  initialChapter,
  chapterNumber,
  highlights,
  onHighlight,
  onRemoveHighlight,
  onExitReader,
  onProgress,
  onChapterChange,
}: Props) {
  const [theme, setTheme] = useState<ReaderTheme>(() => ls('theme', 'dark') as ReaderTheme)
  const [fontSize, setFontSize] = useState(() => Number(ls('fontSize', '18')))
  const [location, setLocation] = useState<string | number | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [percentage, setPercentage] = useState(0)
  const onProgressRef = useRef(onProgress)
  useEffect(() => { onProgressRef.current = onProgress }, [onProgress])
  const onChapterChangeRef = useRef(onChapterChange)
  useEffect(() => { onChapterChangeRef.current = onChapterChange }, [onChapterChange])
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<PanelTab>('ai')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [selectionPopup, setSelectionPopup] = useState<{ x: number; y: number; text: string; cfiRange: string } | null>(null)
  const [aiPrompt, setAiPrompt] = useState<string | null>(null)

  // Load saved location or use initial chapter
  useEffect(() => {
    fetch(`/api/books/${bookId}/progress`)
      .then((r) => r.json())
      .then((data: { percentage: number; lastLocation: string | null }) => {
        if (data.lastLocation) {
          setLocation(data.lastLocation)
          setPercentage(data.percentage)
        } else {
          // Fall back to chapter number (0-based for epub.js)
          setLocation(initialChapter ? initialChapter - 1 : 0)
        }
        setLocationReady(true)
      })
      .catch(() => {
        setLocation(initialChapter ? initialChapter - 1 : 0)
        setLocationReady(true)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const renditionRef = useRef<Rendition | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const onHighlightRef = useRef(onHighlight)
  useEffect(() => { onHighlightRef.current = onHighlight }, [onHighlight])
  // Map highlight text → cfiRange for removal
  const cfiMapRef = useRef<Map<string, string>>(new Map())

  const tv = THEME_VARS[theme]

  const updateTheme = useCallback((t: ReaderTheme) => {
    setTheme(t)
    lsSet('theme', t)
    const r = renditionRef.current
    if (r) {
      r.themes.override('color', THEMES[t].body.color)
      r.themes.override('background', THEMES[t].body.background)
    }
  }, [])

  const updateFontSize = useCallback((s: number) => {
    setFontSize(s)
    lsSet('fontSize', String(s))
    renditionRef.current?.themes.fontSize(`${s}px`)
  }, [])

  // Apply theme + font + selection handling when rendition is ready
  const handleRendition = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition
    rendition.themes.register('custom', THEMES[theme])
    rendition.themes.select('custom')
    rendition.themes.fontSize(`${fontSize}px`)

    // Generate locations for percentage tracking
    rendition.book.ready.then(() => {
      rendition.book.locations.generate(1024)
    })

    // Show selection popup on text selection
    rendition.on('selected', (cfiRange: string) => {
      const range = rendition.getRange(cfiRange)
      const text = range?.toString().trim()
      if (!text || text.length < 3) return

      const rect = range!.getBoundingClientRect()
      // epub.js renders in an iframe — offset rect by the iframe's viewport position
      const iframe = document.querySelector('iframe')
      const iframeRect = iframe?.getBoundingClientRect()
      const offsetX = iframeRect?.left ?? 0
      const offsetY = iframeRect?.top ?? 0
      setSelectionPopup({
        x: rect.left + rect.width / 2 + offsetX,
        y: rect.top + offsetY - 8,
        text,
        cfiRange,
      })
    })

    rendition.on('relocated', () => setSelectionPopup(null))
  }, [theme, fontSize])

  // Close selection popup on next click/tap anywhere (after a delay to avoid race with selection)
  useEffect(() => {
    if (!selectionPopup) return
    const close = (e: MouseEvent) => {
      const popup = document.querySelector(`.${styles.selectionPopup}`)
      if (popup?.contains(e.target as Node)) return
      setSelectionPopup(null)
    }
    const timer = setTimeout(() => {
      document.addEventListener('click', close)
      // Also listen inside the iframe
      const iframe = document.querySelector('iframe')
      iframe?.contentDocument?.addEventListener('click', close)
    }, 300)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', close)
      const iframe = document.querySelector('iframe')
      iframe?.contentDocument?.removeEventListener('click', close)
    }
  }, [selectionPopup])

  // Selection actions
  const handleHighlightSelection = useCallback(() => {
    if (!selectionPopup) return
    onHighlightRef.current(selectionPopup.text)
    // Store cfi mapping and add visual highlight
    cfiMapRef.current.set(selectionPopup.text, selectionPopup.cfiRange)
    renditionRef.current?.annotations.highlight(
      selectionPopup.cfiRange, {}, undefined,
      'hl', { fill: 'rgba(218, 119, 86, 0.3)', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
    )
    setSelectionPopup(null)
  }, [selectionPopup])

  const handleAskAiSelection = useCallback(() => {
    if (!selectionPopup) return
    setAiPrompt(null)
    requestAnimationFrame(() => setAiPrompt(selectionPopup.text))
    setPanelTab('ai')
    setPanelOpen(true)
    setSelectionPopup(null)
  }, [selectionPopup])

  // Remove highlight from epub.js + data store
  const handleRemoveHighlight = useCallback((id: string) => {
    const h = highlights.find((hl) => hl.id === id)
    if (h) {
      const cfi = cfiMapRef.current.get(h.text)
      if (cfi) {
        renditionRef.current?.annotations.remove(cfi, 'highlight')
        cfiMapRef.current.delete(h.text)
      }
    }
    onRemoveHighlight(id)
  }, [highlights, onRemoveHighlight])

  // Controls: show on mouse move near bottom, always visible initially
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (!settingsOpen && !panelOpen) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 4000)
    }
  }, [settingsOpen, panelOpen])

  // Show controls on mouse move
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Always show when mouse is in bottom 80px
      if (e.clientY > window.innerHeight - 80) showControls()
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => document.removeEventListener('mousemove', onMove)
  }, [showControls])

  useEffect(() => {
    if (settingsOpen || panelOpen) {
      setControlsVisible(true) // eslint-disable-line react-hooks/set-state-in-effect
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [settingsOpen, panelOpen])

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape') {
        if (selectionPopup) { setSelectionPopup(null); return }
        if (panelOpen) { setPanelOpen(false); return }
        if (settingsOpen) { setSettingsOpen(false); return }
        onExitReader()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [panelOpen, settingsOpen, selectionPopup, onExitReader])

  const epubUrl = `/api/books/${bookId}/epub`

  return (
    <div
      className={styles.reader}
      style={{ '--reader-bg': tv.bg, '--reader-text': tv.text, '--reader-accent': tv.accent, '--reader-muted': tv.muted, '--reader-surface': tv.surface, '--reader-border': tv.border } as React.CSSProperties}
    >
      {/* epub.js reader */}
      {locationReady && <ReactReader
        url={epubUrl}
        location={location}
        locationChanged={(loc: string) => {
          setLocation(loc)
          const r = renditionRef.current
          if (r) {
            try {
              const pct = Math.round(r.book.locations.percentageFromCfi(loc) * 100)
              setPercentage(pct)
              onProgressRef.current(pct, loc)
            } catch {
              // locations not generated yet
            }
            // Track which chapter epub.js is currently on
            const currentLoc = r.currentLocation() as { start?: { index?: number } }
            const idx = currentLoc?.start?.index
            if (idx !== undefined) {
              // epub.js index is 0-based, our chapters are 1-based
              onChapterChangeRef.current(idx + 1)
            }
          }
        }}
        epubInitOptions={{ openAs: 'epub' }}
        getRendition={handleRendition}
        showToc={false}
        readerStyles={{
          ...ReactReaderStyle,
          readerArea: { ...ReactReaderStyle.readerArea, background: tv.bg, transition: 'background 200ms ease' },
          container: { ...ReactReaderStyle.container, background: tv.bg },
          arrow: { ...ReactReaderStyle.arrow, color: tv.muted },
          arrowHover: { ...ReactReaderStyle.arrowHover, color: tv.text },
          tocButton: { ...ReactReaderStyle.tocButton, display: 'none' },
          tocButtonExpanded: { ...ReactReaderStyle.tocButtonExpanded, display: 'none' },
        } satisfies IReactReaderStyle}
      />}

      {/* Selection popup — Highlight + Ask AI */}
      {selectionPopup && (
        <div
          className={styles.selectionPopup}
          style={{ left: selectionPopup.x, top: selectionPopup.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className={styles.selectionBtn} onClick={handleHighlightSelection}>Highlight</button>
          <button className={styles.selectionBtn} onClick={handleAskAiSelection}>Ask AI</button>
        </div>
      )}

      {/* Bottom trigger zone — hover to show controls */}
      <div className={styles.bottomTrigger} onMouseEnter={showControls} />

      {/* Floating controls */}
      <div className={`${styles.controls} ${controlsVisible ? '' : styles.controlsHidden}`}>
        <button className={styles.controlBtn} onClick={onExitReader} title="Study mode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>
        <div className={styles.controlDivider} />
        <span className={styles.controlProgress}>{percentage}%</span>
        <div className={styles.controlDivider} />
        <button
          className={`${styles.controlBtn} ${settingsOpen ? styles.controlBtnActive : ''}`}
          onClick={() => setSettingsOpen((v) => !v)}
          title="Settings"
        >
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}>Aa</span>
        </button>
        <button
          className={`${styles.controlBtn} ${panelOpen ? styles.controlBtnActive : ''}`}
          onClick={() => { setPanelOpen((v) => !v); setSettingsOpen(false) }}
          title="AI & Notes"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Settings popover */}
      {settingsOpen && (
        <SettingsPopover
          theme={theme} fontSize={fontSize}
          onTheme={updateTheme} onFontSize={updateFontSize}
        />
      )}

      {/* AI/Notes slide-over */}
      {panelOpen && (
        <>
          <div className={styles.panelBackdrop} onClick={() => setPanelOpen(false)} />
          <div className={styles.panelSlideOver}>
            <PanelTabs tab={panelTab} onTab={setPanelTab} highlightCount={highlights.length} />
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {panelTab === 'ai' && <AiTab bookId={bookId} chapterNumber={chapterNumber} prefill={aiPrompt} />}
              {panelTab === 'notes' && <NotesTab bookId={bookId} chapterNumber={chapterNumber} />}
              {panelTab === 'highlights' && <HighlightsTab highlights={highlights} onRemove={handleRemoveHighlight} chapterNumber={chapterNumber} />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ===== Sub-components ===== */

// eslint-disable-next-line react/no-multi-comp
function SettingsPopover({
  theme, fontSize, onTheme, onFontSize,
}: {
  theme: ReaderTheme; fontSize: number
  onTheme: (t: ReaderTheme) => void; onFontSize: (s: number) => void
}) {
  return (
    <div className={styles.settingsPopover}>
      <div className={styles.settingsRow}>
        <span className={styles.settingsLabel}>Theme</span>
        {(['light', 'sepia', 'dark'] as const).map((t) => (
          <button
            key={t}
            className={`${styles.themeCircle} ${styles[`theme${t[0].toUpperCase()}${t.slice(1)}`]} ${theme === t ? styles.themeCircleActive : ''}`}
            onClick={() => onTheme(t)}
            title={t}
          />
        ))}
      </div>
      <div className={styles.settingsRow}>
        <span className={styles.settingsLabel}>Size</span>
        <button className={styles.fontSizeBtn} onClick={() => onFontSize(Math.max(14, fontSize - 1))}>A-</button>
        <span className={styles.fontSizeValue}>{fontSize}</span>
        <button className={styles.fontSizeBtn} onClick={() => onFontSize(Math.min(28, fontSize + 1))}>A+</button>
      </div>
    </div>
  )
}

// eslint-disable-next-line react/no-multi-comp
function PanelTabs({ tab, onTab, highlightCount }: { tab: PanelTab; onTab: (t: PanelTab) => void; highlightCount: number }) {
  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'ai', label: 'AI' },
    { id: 'notes', label: 'Notes' },
    { id: 'highlights', label: `Highlights${highlightCount ? ` (${highlightCount})` : ''}` },
  ]
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--reader-border)', flexShrink: 0 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          style={{
            flex: 1, padding: '12px 8px', border: 'none', background: 'none',
            fontFamily: 'var(--font-ui)', fontSize: 12,
            fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? 'var(--reader-accent)' : 'var(--reader-muted)',
            borderBottom: tab === t.id ? '2px solid var(--reader-accent)' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
