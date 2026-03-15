import { useSyncExternalStore } from 'react'

export type ParseEvent =
  | { type: 'log'; message: string }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_end'; tool: string; summary: string }
  | { type: 'token'; text: string }
  | { type: 'usage'; input: number; output: number; total: number }
  | { type: 'error'; message: string }
  | { type: 'done' }

function createParseEventStore() {
  let events: ParseEvent[] = []
  let snapshot: ParseEvent[] = []
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
    push(event: ParseEvent) {
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

export const parseEventStore = createParseEventStore()

export function useParseEvents(): ParseEvent[] {
  return useSyncExternalStore(parseEventStore.subscribe, parseEventStore.getSnapshot)
}
