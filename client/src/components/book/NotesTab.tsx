import { useState } from 'react'
import { useNotes } from '../../hooks/useNotes'
import { Markdown } from './Markdown'
import styles from '../../routes/Book.module.css'

export function NotesTab({
  bookId,
  chapterNumber,
}: {
  bookId: string
  chapterNumber: number | null
}) {
  const { content, update, flush, saving, loaded } = useNotes(bookId, chapterNumber)
  const [mode, setMode] = useState<'edit' | 'preview'>('preview')

  if (!chapterNumber) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyText}>Select a chapter to take notes</span>
      </div>
    )
  }

  return (
    <div className={styles.notesBody}>
      <div className={styles.notesToolbar}>
        <div className={styles.notesToggle}>
          <button
            className={`${styles.notesToggleBtn} ${mode === 'edit' ? styles.notesToggleBtnActive : ''}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            className={`${styles.notesToggleBtn} ${mode === 'preview' ? styles.notesToggleBtnActive : ''}`}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
        {saving && <span className={styles.notesSaving}>Saving...</span>}
      </div>
      {loaded && mode === 'edit' ? (
        <textarea
          className={styles.notesTextarea}
          value={content}
          onChange={(e) => update(e.target.value)}
          onBlur={flush}
          placeholder="Write your notes in markdown..."
          spellCheck={false}
        />
      ) : loaded && mode === 'preview' ? (
        <div className={styles.notesPreview}>
          {content ? (
            <Markdown content={content} />
          ) : (
            <span className={styles.emptyText}>No notes yet</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
