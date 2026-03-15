import type { Highlight } from '../../hooks/useHighlights'
import styles from '../../routes/Book.module.css'

export function HighlightsTab({
  highlights,
  onRemove,
  chapterNumber,
}: {
  highlights: Highlight[]
  onRemove: (id: string) => void
  chapterNumber: number | null
}) {
  if (!chapterNumber) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyText}>Select a chapter to see highlights</span>
      </div>
    )
  }

  if (highlights.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyText}>Select text in the chapter to highlight</span>
      </div>
    )
  }

  return (
    <div className={styles.highlightsList}>
      {highlights.map((h) => (
        <div key={h.id} className={styles.highlightItem}>
          <span className={styles.highlightText}>{h.text}</span>
          <button className={styles.highlightRemove} onClick={() => onRemove(h.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
