import { useCallback, useEffect, useRef, useState } from 'react'
import { PROVIDERS, type Provider } from '../data/providers'

type LoginStatus =
  | 'idle'
  | 'connecting'
  | 'waiting_browser'
  | 'device_code'
  | 'prompt'
  | 'success'
  | 'error'

type LoginState = {
  providerId: string | null
  status: LoginStatus
  deviceCode?: string
  deviceUrl?: string
  promptMessage?: string
  error?: string
}

export type ProviderWithStatus = Provider & { connected: boolean }

const STORAGE_KEY = 'readingisfun:provider'

export function useAuth() {
  const [providers, setProviders] = useState<ProviderWithStatus[]>(
    PROVIDERS.map((p) => ({ ...p, connected: false })),
  )
  const [loginState, setLoginState] = useState<LoginState>({ providerId: null, status: 'idle' })
  const [selectedProvider, setSelectedProviderState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )
  const eventSourceRef = useRef<EventSource | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSelectedProvider = useCallback((id: string | null) => {
    setSelectedProviderState(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status')
      const data = (await res.json()) as { providers: { id: string; connected: boolean }[] }
      const statusMap = new Map(data.providers.map((p) => [p.id, p.connected]))
      setProviders(PROVIDERS.map((p) => ({ ...p, connected: statusMap.get(p.id) ?? false })))
    } catch {
      // Server may not be running yet; keep all disconnected
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data: { providers: { id: string; connected: boolean }[] }) => {
        if (cancelled) return
        const statusMap = new Map(data.providers.map((p) => [p.id, p.connected]))
        setProviders(PROVIDERS.map((p) => ({ ...p, connected: statusMap.get(p.id) ?? false })))
      })
      .catch(() => {
        // Server may not be running yet; keep all disconnected
      })

    return () => {
      cancelled = true
      eventSourceRef.current?.close()
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const closeStream = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }, [])

  const cancelAuth = useCallback(() => {
    closeStream()
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    setLoginState({ providerId: null, status: 'idle' })
  }, [closeStream])

  const login = useCallback(
    (providerId: string) => {
      closeStream()
      setLoginState({ providerId, status: 'connecting' })

      const es = new EventSource(`/api/auth/login/${providerId}`)
      eventSourceRef.current = es

      es.addEventListener('auth_url', (e: MessageEvent) => {
        const { url } = JSON.parse(e.data) as { url: string }
        window.open(url, '_blank')
        setLoginState({ providerId, status: 'waiting_browser' })
      })

      es.addEventListener('device_code', (e: MessageEvent) => {
        const { code, url } = JSON.parse(e.data) as { code: string; url: string }
        setLoginState({ providerId, status: 'device_code', deviceCode: code, deviceUrl: url })
      })

      es.addEventListener('prompt', (e: MessageEvent) => {
        const { message } = JSON.parse(e.data) as { message: string }
        setLoginState({ providerId, status: 'prompt', promptMessage: message })
      })

      es.addEventListener('success', () => {
        closeStream()
        setLoginState({ providerId, status: 'success' })
        fetchStatus()
        dismissTimerRef.current = setTimeout(() => {
          setLoginState({ providerId: null, status: 'idle' })
        }, 1200)
      })

      es.addEventListener('error', (e: MessageEvent) => {
        closeStream()
        const errorMsg = e.data
          ? (JSON.parse(e.data) as { message: string }).message
          : 'Connection failed'
        setLoginState({ providerId, status: 'error', error: errorMsg })
      })

      es.onerror = () => {
        closeStream()
        setLoginState({ providerId, status: 'error', error: 'Connection lost' })
      }
    },
    [closeStream, fetchStatus],
  )

  const submitPrompt = useCallback(
    async (code: string) => {
      if (!loginState.providerId) return
      await fetch(`/api/auth/prompt/${loginState.providerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
    },
    [loginState.providerId],
  )

  const logout = useCallback(
    async (providerId: string) => {
      await fetch(`/api/auth/logout/${providerId}`, { method: 'POST' })
      if (selectedProvider === providerId) setSelectedProvider(null)
      await fetchStatus()
    },
    [fetchStatus, selectedProvider, setSelectedProvider],
  )

  return {
    providers,
    loginState,
    selectedProvider,
    setSelectedProvider,
    login,
    logout,
    cancelAuth,
    submitPrompt,
  }
}
