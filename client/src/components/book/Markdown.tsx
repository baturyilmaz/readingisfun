import { useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import styles from './Markdown.module.css'

export function Markdown({ content, allowHtml }: { content: string; allowHtml?: boolean }) {
  const navigate = useNavigate()
  const { bookId } = useParams<{ bookId: string }>()
  const location = useLocation()
  const mode = location.pathname.includes('/read/') ? 'read' : 'study'

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const match = href.match(/^#readingisfun-chapter-(\d+)$/)
      if (match && bookId) {
        e.preventDefault()
        navigate(`/${bookId}/${mode}/${match[1]}`)
      }
    },
    [bookId, mode, navigate],
  )

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={allowHtml ? [rehypeRaw] : []}
        components={{
          a: ({ children, href, ...props }) => {
            const isInternal = href?.startsWith('#readingisfun-chapter-')
            return (
              <a
                {...props}
                href={href}
                target={isInternal ? undefined : '_blank'}
                rel={isInternal ? undefined : 'noopener noreferrer'}
                onClick={isInternal ? (e) => handleClick(e, href!) : undefined}
              >
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
