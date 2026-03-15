import { memo, useCallback, useState } from 'react'
import type { ChatMessage as ChatMsg } from '../../hooks/useChat'
import { Markdown } from './Markdown'
import styles from '../../routes/Book.module.css'

export const ChatMessage = memo(function ChatMessage({ message }: { message: ChatMsg }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [message.text])

  return (
    <div className={`${styles.chatMsg} ${isUser ? styles.chatMsgUser : styles.chatMsgAssistant}`}>
      {isUser ? (
        <div className={styles.chatMsgUserText}>{message.text}</div>
      ) : (
        <div className={styles.chatMsgAssistantWrap}>
          <div className={styles.chatMsgAssistantText}>
            <Markdown content={message.text} />
          </div>
          <button className={styles.chatCopyBtn} onClick={handleCopy} title="Copy raw response">
            {copied ? (
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
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
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
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
})
