import { Button, Loader, Text, TextInput } from '@mantine/core'
import { useState } from 'react'
import type { useAuth, ProviderWithStatus } from '../../hooks/useAuth'
import { IconCheck } from './icons'
import { PulsingDot } from './PulsingDot'
import styles from './AuthStage.module.css'

type AuthStageProps = {
  loginState: ReturnType<typeof useAuth>['loginState']
  provider: ProviderWithStatus | undefined
  onCancel: () => void
  onSubmitPrompt: (code: string) => void
  onRetry: () => void
}

export function AuthStage({
  loginState,
  provider,
  onCancel,
  onSubmitPrompt,
  onRetry,
}: AuthStageProps) {
  const [inputCode, setInputCode] = useState('')

  const handleSubmit = () => {
    onSubmitPrompt(inputCode.trim())
    setInputCode('')
  }

  const handleCopy = async () => {
    if (loginState.deviceCode) {
      await navigator.clipboard.writeText(loginState.deviceCode)
    }
  }

  const { status } = loginState
  const letter = provider?.letter ?? '?'
  const name = provider?.name ?? 'Provider'

  return (
    <div className={styles.stage}>
      <div key={status} className={styles.content}>
        {status === 'connecting' && (
          <>
            <div className={styles.providerCircle}>{letter}</div>
            <Loader size={20} color="var(--accent)" />
            <Text size="sm" c="var(--text-secondary)">
              Connecting to {name}...
            </Text>
          </>
        )}

        {status === 'waiting_browser' && (
          <>
            <div className={styles.providerCircle}>{letter}</div>
            <div className={styles.waitingRow}>
              <PulsingDot />
              <Text size="sm" fw={500}>
                Waiting for authorization
              </Text>
            </div>
            <Text size="xs" c="var(--text-secondary)">
              Complete the sign-in in your browser. This page will update automatically.
            </Text>
            <button type="button" className={styles.cancel} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}

        {status === 'device_code' && (
          <>
            <Text size="sm" fw={500}>
              Enter this code
            </Text>
            <div className={styles.codeBlock}>{loginState.deviceCode}</div>
            <Button size="xs" variant="subtle" color="var(--accent)" onClick={handleCopy}>
              Copy code
            </Button>
            {loginState.deviceUrl && (
              <a
                href={loginState.deviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.verifyLink}
              >
                {loginState.deviceUrl}
              </a>
            )}
            <div className={styles.waitingRow}>
              <PulsingDot />
              <Text size="xs" c="var(--text-secondary)">
                Waiting for verification...
              </Text>
            </div>
            <button type="button" className={styles.cancel} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}

        {status === 'prompt' && (
          <>
            <Text size="sm" c="var(--text-secondary)">
              {loginState.promptMessage ?? 'Paste the authorization code below:'}
            </Text>
            <TextInput
              className={styles.promptInput}
              value={inputCode}
              onChange={(e) => setInputCode(e.currentTarget.value)}
              placeholder="Authorization code"
              styles={{ input: { fontFamily: 'var(--font-mono)' } }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Button fullWidth color="var(--accent)" onClick={handleSubmit}>
              Submit
            </Button>
            <button type="button" className={styles.cancel} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successCircle}>
              <IconCheck />
            </div>
            <Text size="sm" fw={500}>
              Connected
            </Text>
            <Text size="xs" c="var(--text-secondary)">
              {name}
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.errorCircle}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <Text size="sm" c="var(--error)">
              {loginState.error ?? 'Connection failed'}
            </Text>
            <Button variant="outline" color="var(--accent)" size="xs" onClick={onRetry}>
              Try Again
            </Button>
            <button type="button" className={styles.cancel} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
