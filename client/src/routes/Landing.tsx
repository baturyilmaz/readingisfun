import { Button, Paper, Text } from '@mantine/core'
import { useNavigate } from 'react-router'
import { Logo } from '../components/shared/Logo'
import { ProviderList } from '../components/landing/ProviderList'
import { AuthStage } from '../components/landing/AuthStage'
import { useAuth } from '../hooks/useAuth'
import styles from './Landing.module.css'

export function Landing() {
  const navigate = useNavigate()
  const auth = useAuth()

  const canStart =
    auth.selectedProvider &&
    auth.providers.some((p) => p.id === auth.selectedProvider && p.connected)

  const authActive = auth.loginState.status !== 'idle'
  const authProvider = auth.providers.find((p) => p.id === auth.loginState.providerId)

  const handleStart = () => {
    if (!canStart) return
    navigate('/select')
  }

  const handleRetry = () => {
    if (auth.loginState.providerId) auth.login(auth.loginState.providerId)
  }

  const cardClass = `${styles.card} ${authActive ? styles.cardExpanded : ''}`
  const rightClass = `${styles.rightPanel} ${authActive ? styles.rightPanelVisible : ''}`

  return (
    <div className={styles.page}>
      <Paper className={cardClass} shadow="md" withBorder>
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <Logo size="lg" />
            <Text size="sm" c="var(--text-secondary)" ta="center">
              Connect your AI provider to start reading
            </Text>
          </div>

          <ProviderList {...auth} />

          <div className={styles.footer}>
            <Button fullWidth color="var(--accent)" disabled={!canStart} onClick={handleStart}>
              Start Reading
            </Button>
          </div>
        </div>

        {authActive && (
          <>
            <div className={styles.divider} />
            <div className={rightClass}>
              <AuthStage
                loginState={auth.loginState}
                provider={authProvider}
                onCancel={auth.cancelAuth}
                onSubmitPrompt={auth.submitPrompt}
                onRetry={handleRetry}
              />
            </div>
          </>
        )}
      </Paper>
    </div>
  )
}
