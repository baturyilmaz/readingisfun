import { Stack } from '@mantine/core'
import { ProviderCard } from './ProviderCard'
import type { useAuth } from '../../hooks/useAuth'

type ProviderListProps = ReturnType<typeof useAuth>

export function ProviderList({
  providers,
  loginState,
  selectedProvider,
  setSelectedProvider,
  login,
  logout,
}: ProviderListProps) {
  const authBusy = loginState.status !== 'idle'

  return (
    <Stack gap="xs">
      {providers.map((provider) => {
        const isTarget = loginState.providerId === provider.id
        const connecting = isTarget && loginState.status === 'connecting'
        const disabled = authBusy && !isTarget && !provider.connected

        return (
          <ProviderCard
            key={provider.id}
            provider={provider}
            selected={selectedProvider === provider.id}
            connecting={connecting}
            authActive={isTarget && authBusy}
            disabled={disabled}
            onConnect={() => login(provider.id)}
            onSelect={() => setSelectedProvider(provider.id)}
            onDisconnect={() => logout(provider.id)}
          />
        )
      })}
    </Stack>
  )
}
