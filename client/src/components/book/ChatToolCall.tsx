import { memo } from 'react'
import type { ChatEvent } from '../../stores/chatEventStore'
import styles from '../../routes/Book.module.css'

const TOOL_LABELS: Record<string, string> = {
  read: 'Reading',
  grep: 'Searching',
  find: 'Finding',
  ls: 'Listing',
}

export const ChatToolCall = memo(function ChatToolCall({ event }: { event: ChatEvent }) {
  if (event.type === 'tool_start') {
    const label = TOOL_LABELS[event.tool] ?? event.tool
    const file = (event.args as { path?: string }).path ?? ''
    return (
      <div className={styles.chatTool}>
        <span className={styles.chatToolLabel}>{label}</span>
        {file && <span className={styles.chatToolFile}>{file.split('/').pop()}</span>}
      </div>
    )
  }
  return null
})
