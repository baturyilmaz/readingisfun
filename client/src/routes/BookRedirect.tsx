import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Loader } from '@mantine/core'

export function BookRedirect() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!bookId) {
      navigate('/', { replace: true })
      return
    }
    const mode = localStorage.getItem('readingisfun:mode') === 'read' ? 'read' : 'study'
    navigate(`/${bookId}/${mode}/1`, { replace: true })
  }, [bookId, navigate])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader size="sm" color="var(--accent)" />
    </div>
  )
}
