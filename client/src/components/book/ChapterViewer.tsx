import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router'
import type { ChapterData } from '../../hooks/useBook'
import type { Highlight } from '../../hooks/useHighlights'
import styles from '../../routes/Book.module.css'

export function ChapterViewer({
  chapter,
  highlights,
  onHighlight,
  onAskAi,
}: {
  chapter: ChapterData
  highlights: Highlight[]
  onHighlight: (text: string) => void
  onAskAi: (text: string) => void
}) {
  const [popup, setPopup] = useState<{ text: string; x: number; y: number } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { bookId } = useParams<{ bookId: string }>()
  const location = useLocation()
  const mode = location.pathname.includes('/read/') ? 'read' : 'study'

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!text || text.length < 3 || !sel?.rangeCount) {
        setPopup(null)
        return
      }
      const container = contentRef.current
      if (!container) return
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      setPopup({
        text,
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top + container.scrollTop - 8,
      })
    }, 0)
  }, [])

  const handleHighlight = useCallback(() => {
    if (!popup) return
    onHighlight(popup.text)
    window.getSelection()?.removeAllRanges()
    setPopup(null)
  }, [popup, onHighlight])

  const handleAskAi = useCallback(() => {
    if (!popup) return
    onAskAi(popup.text)
    window.getSelection()?.removeAllRanges()
    setPopup(null)
  }, [popup, onAskAi])

  // Intercept internal chapter links
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (!link) return
      const href = link.getAttribute('href')
      const match = href?.match(/^#readingisfun-chapter-(\d+)$/)
      if (match && bookId) {
        e.preventDefault()
        navigate(`/${bookId}/${mode}/${match[1]}`)
      }
    },
    [bookId, mode, navigate],
  )

  useEffect(() => {
    if (!popup) return
    const close = () => setPopup(null)
    const container = contentRef.current
    document.addEventListener('mousedown', close, { once: true })
    container?.addEventListener('scroll', close, { once: true })
    return () => {
      document.removeEventListener('mousedown', close)
      container?.removeEventListener('scroll', close)
    }
  }, [popup])

  // Render raw XHTML with highlights applied
  let html = chapter.content
  for (const h of highlights) {
    const escaped = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    html = html.replace(new RegExp(escaped, 'g'), `<mark class="hl">${h.text}</mark>`)
  }

  return (
    <div className={styles.content} ref={contentRef} onMouseUp={handleMouseUp} onClick={handleClick}>
      {popup && (
        <div className={styles.selectionPopup} style={{ left: popup.x, top: popup.y }}>
          <button
            className={styles.selectionPopupBtn}
            onMouseDown={(e) => { e.stopPropagation(); handleHighlight() }}
          >
            Highlight
          </button>
          <button
            className={styles.selectionPopupBtn}
            onMouseDown={(e) => { e.stopPropagation(); handleAskAi() }}
          >
            AI
          </button>
        </div>
      )}
      <div className={styles.contentInner} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
