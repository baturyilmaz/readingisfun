import { useNavigate } from 'react-router'
import type { ChapterEntry } from '../../hooks/useBook'
import { Logo } from '../shared/Logo'
import styles from '../../routes/Book.module.css'

export function ChapterSidebar({
  bookTitle,
  chapters,
  activeNumber,
  onSelect,
  onCollapse,
}: {
  bookTitle: string
  chapters: ChapterEntry[]
  activeNumber: number | null
  onSelect: (n: number) => void
  onCollapse: () => void
}) {
  const navigate = useNavigate()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <button className={styles.logoLink} onClick={() => navigate('/select')}>
          <Logo size="xs" />
        </button>
        <span className={styles.bookTitle}>{bookTitle}</span>
        <span className={styles.lessonCount}>{chapters.length}</span>
        <button className={styles.collapseBtn} onClick={onCollapse}>
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
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
      </div>
      <div className={styles.lessonList}>
        {chapters.map((c) => (
          <button
            key={c.number}
            className={`${styles.lessonItem} ${c.number === activeNumber ? styles.lessonItemActive : ''}`}
            onClick={() => onSelect(c.number)}
          >
            <span className={styles.lessonNumber}>{c.number}</span>
            <span className={styles.lessonTitle}>{c.title}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
