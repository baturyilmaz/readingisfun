import { Button, Group, Loader, Stack, Text } from '@mantine/core'
import { IconCheck } from './icons'
import type { ProviderWithStatus } from '../../hooks/useAuth'
import styles from './ProviderCard.module.css'

type ProviderCardProps = {
  provider: ProviderWithStatus
  selected: boolean
  connecting: boolean
  authActive?: boolean
  disabled?: boolean
  onConnect: () => void
  onSelect: () => void
  onDisconnect: () => void
}

export function ProviderCard({
  provider,
  selected,
  connecting,
  authActive,
  disabled,
  onConnect,
  onSelect,
  onDisconnect,
}: ProviderCardProps) {
  const cardClass = [
    styles.card,
    provider.connected && styles.cardConnected,
    selected && styles.cardSelected,
    authActive && styles.cardAuthActive,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cardClass}
      onClick={provider.connected ? onSelect : undefined}
      role={provider.connected ? 'button' : undefined}
      tabIndex={provider.connected ? 0 : undefined}
      onKeyDown={provider.connected ? (e) => e.key === 'Enter' && onSelect() : undefined}
    >
      <div
        className={`${styles.letter} ${provider.connected ? styles.letterConnected : styles.letterDefault}`}
      >
        {provider.letter}
      </div>

      <Stack gap={2} className={styles.info}>
        <Text size="sm" fw={500}>
          {provider.name}
        </Text>
        <Text size="xs" c="var(--text-secondary)">
          {provider.description}
        </Text>
      </Stack>

      <Group gap="xs">
        {connecting ? (
          <Loader size={18} color="var(--accent)" />
        ) : provider.connected ? (
          <div className={styles.connectedActions}>
            <span className={styles.check}>
              <IconCheck />
            </span>
            <button
              className={styles.disconnectBtn}
              onClick={(e) => {
                e.stopPropagation()
                onDisconnect()
              }}
              title="Disconnect"
            >
              &times;
            </button>
          </div>
        ) : (
          <Button
            size="xs"
            variant="outline"
            color="var(--accent)"
            onClick={onConnect}
            className={disabled ? styles.btnDisabled : undefined}
          >
            Connect
          </Button>
        )}
      </Group>
    </div>
  )
}
