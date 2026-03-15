import { Button, Paper, Text } from '@mantine/core'
import { useNavigate } from 'react-router'
import { Logo } from '../components/shared/Logo'
import { useParsedBooks } from '../hooks/useParsedBooks'
import styles from './Landing.module.css'

export function Select() {
  const navigate = useNavigate()
  const { books, error, progress, deleteBook } = useParsedBooks()

  const handleDelete = (bookId: string, title: string) => {
    if (!window.confirm(`Delete "${title}" and all its data?`)) return
    deleteBook(bookId)
  }

  return (
    <div className={styles.page}>
      <Paper className={styles.card} shadow="md" withBorder>
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <Logo size="lg" />
            <Text size="sm" c="var(--text-secondary)" ta="center">
              What would you like to do?
            </Text>
          </div>

          <div className={styles.choicePanel}>
            {error && (
              <Text c="var(--error)" size="sm" ta="center" mb={8}>
                {error}
              </Text>
            )}

            {books.length > 0 && (
              <div className={styles.books}>
                <Text size="xs" c="var(--text-tertiary)" fw={500} mb={8}>
                  Continue reading
                </Text>
                {books.map((b) => (
                  <div key={b.bookId} className={styles.bookItem}>
                    <button
                      className={styles.bookItemBtn}
                      onClick={() => navigate(`/${b.bookId}`)}
                    >
                      {b.coverImage && (
                        <img
                          src={`/api/books/${b.bookId}/images/${b.coverImage}`}
                          alt=""
                          className={styles.bookCover}
                        />
                      )}
                      <div className={styles.bookInfo}>
                        <span className={styles.bookName}>{b.bookTitle}</span>
                        <span className={styles.bookMeta}>
                          {b.bookAuthor} &middot;{' '}
                          {progress[b.bookId]?.percentage
                            ? `${progress[b.bookId].percentage}% read`
                            : `${b.totalChapters} chapters`}
                        </span>
                      </div>
                    </button>
                    <button
                      className={styles.bookDelete}
                      onClick={() => handleDelete(b.bookId, b.bookTitle)}
                      title="Delete book"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {books.length > 0 && (
              <div className={styles.choiceDivider}>
                <span className={styles.choiceDividerText}>or</span>
              </div>
            )}

            <Button
              fullWidth
              variant="light"
              color="var(--accent)"
              onClick={() => navigate('/import')}
            >
              Import a book
            </Button>

            <button className={styles.backLink} onClick={() => navigate('/')}>
              Back
            </button>
          </div>
        </div>
      </Paper>
    </div>
  )
}
