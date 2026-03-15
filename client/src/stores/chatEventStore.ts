import { useSyncExternalStore } from 'react'

export type ChatEvent =
  | { type: 'log'; message: string }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_end'; tool: string; summary: string }
  | { type: 'token'; text: string }
  | { type: 'usage'; input: number; output: number; total: number }
  | { type: 'error'; message: string }
  | { type: 'done' }

function createChatEventStore() {
  let events: ChatEvent[] = []
  let snapshot: ChatEvent[] = []
  const listeners = new Set<() => void>()
  let rafId: number | null = null

  const notify = () => {
    for (const fn of listeners) fn()
  }

  const scheduleNotify = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      snapshot = events
      notify()
    })
  }

  return {
    push(event: ChatEvent) {
      events = [...events, event]
      scheduleNotify()
    },
    clear() {
      events = []
      snapshot = []
      notify()
    },
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    getSnapshot() {
      return snapshot
    },
  }
}

export const chatEventStore = createChatEventStore()

export function useChatEvents(): ChatEvent[] {
  return useSyncExternalStore(chatEventStore.subscribe, chatEventStore.getSnapshot)
}
