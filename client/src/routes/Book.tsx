import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router'
import { Loader } from '@mantine/core'
import { useBook } from '../hooks/useBook'
import { useHighlights } from '../hooks/useHighlights'
import { useProgress } from '../hooks/useProgress'
import { ChapterSidebar } from '../components/book/ChapterSidebar'
import { ChapterViewer } from '../components/book/ChapterViewer'
import { RightPanel } from '../components/book/RightPanel'
import { ThemeToggle } from '../components/shared/ThemeToggle'
import { ReaderMode } from '../components/reader/ReaderMode'
import styles from './Book.module.css'

export function Book() {
  const { bookId, chapter } = useParams<{ bookId: string; chapter: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const chapterNumber = Number(chapter) || null
  const mode = location.pathname.includes('/read/') ? 'reader' : 'study'

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(268)
  const [rightOpen, setRightOpen] = useState(true)
  const [rightWidth, setRightWidth] = useState(268)
  const dragging = useRef(false)

  const startDrag = useCallback(
    (e: React.MouseEvent, getWidth: (dx: number) => number, setWidth: (w: number) => void) => {
      e.preventDefault()
      dragging.current = true
      const startX = e.clientX
      const onMove = (ev: MouseEvent) => setWidth(getWidth(ev.clientX - startX))
      const onUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [],
  )

  const onLeftResizeStart = useCallback(
    (e: React.MouseEvent) => {
      const startW = sidebarWidth
      startDrag(e, (dx) => Math.min(Math.max(startW + dx, 200), 480), setSidebarWidth)
    },
    [sidebarWidth, startDrag],
  )

  const onRightResizeStart = useCallback(
    (e: React.MouseEvent) => {
      const startW = rightWidth
      startDrag(e, (dx) => Math.min(Math.max(startW - dx, 200), 480), setRightWidth)
    },
    [rightWidth, startDrag],
  )

  const [aiPrompt, setAiPrompt] = useState<string | null>(null)
  const [readerChapter, setReaderChapter] = useState<number | null>(chapterNumber)

  const { manifest, activeChapter, loading, error, selectChapter: rawSelectChapter } = useBook(
    bookId!,
  )
  const { highlights, addHighlight, removeHighlight } = useHighlights(bookId!, chapterNumber)
  const { updateProgress } = useProgress(bookId!)

  // Load chapter from URL param
  useEffect(() => {
    if (chapterNumber) rawSelectChapter(chapterNumber)
  }, [chapterNumber, rawSelectChapter])

  // Navigate to chapter via URL
  const selectChapter = useCallback(
    (n: number) => {
      const m = mode === 'reader' ? 'read' : 'study'
      navigate(`/${bookId}/${m}/${n}`)
    },
    [bookId, mode, navigate],
  )

  const toggleMode = useCallback(() => {
    const ch = chapterNumber ?? 1
    if (mode === 'study') {
      localStorage.setItem('readingisfun:mode', 'read')
      navigate(`/${bookId}/read/${ch}`)
    } else {
      localStorage.setItem('readingisfun:mode', 'study')
      navigate(`/${bookId}/study/${ch}`)
    }
  }, [bookId, chapterNumber, mode, navigate])

  const bookTitle = manifest?.bookTitle ?? bookId

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader size="sm" color="var(--accent)" />
      </div>
    )
  }

  if (error || !manifest) {
    return <div className={styles.error}>{error ?? 'Book not found'}</div>
  }

  if (mode === 'reader') {
    return (
      <ReaderMode
        bookId={bookId!}
        initialChapter={chapterNumber}
        chapterNumber={readerChapter}
        highlights={highlights}
        onHighlight={addHighlight}
        onRemoveHighlight={removeHighlight}
        onExitReader={toggleMode}
        onProgress={updateProgress}
        onChapterChange={setReaderChapter}
      />
    )
  }

  const activeIdx = manifest.chapters.findIndex((c) => c.number === chapterNumber)
  const prevChapter = activeIdx > 0 ? manifest.chapters[activeIdx - 1] : null
  const nextChapter =
    activeIdx >= 0 && activeIdx < manifest.chapters.length - 1
      ? manifest.chapters[activeIdx + 1]
      : null

  return (
    <div className={styles.layout}>
      <div
        className={`${styles.sidebarWrap} ${sidebarOpen ? '' : styles.sidebarCollapsed}`}
        style={sidebarOpen ? { width: sidebarWidth, minWidth: sidebarWidth } : undefined}
      >
        <ChapterSidebar
          bookTitle={bookTitle!}
          chapters={manifest.chapters}
          activeNumber={chapterNumber}
          onSelect={selectChapter}
          onCollapse={() => setSidebarOpen(false)}
        />
        {sidebarOpen && <div className={styles.resizeHandle} onMouseDown={onLeftResizeStart} />}
      </div>
      <main className={styles.main}>
        <div className={styles.topbar}>
          {activeChapter ? (
            <>
              <div className={styles.topbarLeft}>
                {!sidebarOpen && (
                  <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                  </button>
                )}
              </div>
              <div className={styles.topbarCenter}>
                <button
                  className={styles.navBtn}
                  disabled={!prevChapter}
                  onClick={() => prevChapter && selectChapter(prevChapter.number)}
                >
                  &lsaquo;
                </button>
                <span className={styles.navLabel}>
                  {activeIdx + 1} / {manifest.chapters.length}
                </span>
                <button
                  className={styles.navBtn}
                  disabled={!nextChapter}
                  onClick={() => nextChapter && selectChapter(nextChapter.number)}
                >
                  &rsaquo;
                </button>
              </div>
              <div className={styles.topbarRight}>
                <button className={styles.sidebarToggle} onClick={toggleMode} title="Reader mode">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </button>
                <ThemeToggle />
                {!rightOpen && (
                  <button className={styles.sidebarToggle} onClick={() => setRightOpen(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={styles.topbarLeft}>
                {!sidebarOpen && (
                  <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                  </button>
                )}
                <span className={styles.breadcrumb}>{bookTitle}</span>
              </div>
              <div />
              <div className={styles.topbarRight}>
                <ThemeToggle />
                {!rightOpen && (
                  <button className={styles.sidebarToggle} onClick={() => setRightOpen(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {activeChapter ? (
          <ChapterViewer
            chapter={activeChapter}
            highlights={highlights}
            onHighlight={addHighlight}
            onAskAi={(text) => {
              setRightOpen(true)
              setAiPrompt(null)
              requestAnimationFrame(() => setAiPrompt(text))
            }}
          />
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyText}>Select a chapter to begin</span>
          </div>
        )}
      </main>
      <div
        className={`${styles.rightPanelWrap} ${rightOpen ? '' : styles.rightPanelCollapsed}`}
        style={rightOpen ? { width: rightWidth, minWidth: rightWidth } : undefined}
      >
        {rightOpen && <div className={styles.rightResizeHandle} onMouseDown={onRightResizeStart} />}
        <RightPanel
          bookId={bookId!}
          chapterNumber={chapterNumber}
          highlights={highlights}
          onRemoveHighlight={removeHighlight}
          onCollapse={() => setRightOpen(false)}
          aiPrompt={aiPrompt}
        />
      </div>
    </div>
  )
}
