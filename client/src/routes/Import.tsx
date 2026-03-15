import { useEffect } from 'react'
import { Button, Paper, Text } from '@mantine/core'
import { useNavigate } from 'react-router'
import { Logo } from '../components/shared/Logo'
import { useImport } from '../hooks/useImport'
import { parseEventStore, useParseEvents } from '../stores/parseEventStore'
import styles from './Landing.module.css'

export function Import() {
  useEffect(() => { parseEventStore.clear() }, [])
  const navigate = useNavigate()
  const { file, importing, done, bookId, error, setFile, startImport } = useImport()
  const events = useParseEvents()

  const logMessages = events
    .filter((e) => e.type === 'log')
    .map((e) => (e as { message: string }).message)

  return (
    <div className={styles.page}>
      <Paper className={styles.card} shadow="md" withBorder>
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <Logo size="lg" />
            <Text size="sm" c="var(--text-secondary)" ta="center">
              Import an EPUB to start reading
            </Text>
          </div>

          <div className={styles.choicePanel}>
            {!done && (
              <>
                <label className={styles.fileLabel}>
                  <input
                    type="file"
                    accept=".epub"
                    style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={importing}
                  />
                  <span className={styles.filePicker}>
                    {file ? file.name : 'Choose EPUB file...'}
                  </span>
                </label>

                {file && !importing && (
                  <Text size="xs" c="var(--text-tertiary)" ta="center">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </Text>
                )}

                <Button
                  fullWidth
                  color="var(--accent)"
                  disabled={!file || importing}
                  loading={importing}
                  onClick={startImport}
                >
                  Import
                </Button>
              </>
            )}

            {logMessages.length > 0 && (
              <div className={styles.importLog}>
                {logMessages.map((msg, i) => (
                  <div key={i} className={styles.importLogLine}>
                    {msg}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <Text size="sm" c="red" ta="center">
                {error}
              </Text>
            )}

            {done && bookId && (
              <Button fullWidth color="var(--accent)" onClick={() => navigate(`/${bookId}`)}>
                Open Book
              </Button>
            )}

            <button className={styles.backLink} onClick={() => navigate('/select')}>
              Back
            </button>
          </div>
        </div>
      </Paper>
    </div>
  )
}
