import { Agent, type AgentEvent, type AgentMessage } from '@mariozechner/pi-agent-core'
import type { Api, Model } from '@mariozechner/pi-ai'
import { createReadOnlyTools } from '@mariozechner/pi-coding-agent'
import { baseDir, booksDir } from '../parse/storage.js'
import { createWebSearchTool } from './webSearchTool.js'

function log(msg: string, ...args: unknown[]): void {
  console.log(`[chat-agent] ${msg}`, ...args)
}

export type ChatSSEEvent =
  | { type: 'log'; message: string }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_end'; tool: string; summary: string }
  | { type: 'token'; text: string }
  | { type: 'usage'; input: number; output: number; total: number }
  | { type: 'error'; message: string }
  | { type: 'done' }

type CachedAgent = { agent: Agent; lastUsed: number; webSearch: boolean }
const agentCache = new Map<string, CachedAgent>()

// Evict idle agents every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [id, entry] of agentCache) {
      if (now - entry.lastUsed > 30 * 60 * 1000) agentCache.delete(id)
    }
  },
  5 * 60 * 1000,
)

function buildSystemPrompt(opts: {
  bookTitle: string
  bookAuthor: string
  bookId: string
  chapterNumber: number
  chapterTitle: string
}): string {
  const booksPath = `${baseDir()}/books/${opts.bookId}`

  return [
    `You are a reading companion for "${opts.bookTitle}" by ${opts.bookAuthor}.`,
    `The reader is currently on chapter ${opts.chapterNumber}: "${opts.chapterTitle}".`,
    '',
    'File structure:',
    `- ${booksPath}/manifest.json — full chapter list with titles and word counts`,
    `- ${booksPath}/chapters/{N}/raw.html — chapter content (EPUB XHTML)`,
    `- ${booksPath}/chapters/{N}/metadata.json — title, word count, image references`,
    `- ${booksPath}/images/ — extracted book images`,
    '',
    'When the reader sends a passage from the book, they selected it while reading and want you to explain, discuss, or answer questions about it. Read the current chapter to understand the full context before responding.',
    '',
    'Rules:',
    '- Use your tools (read, grep, ls) to look up content. Do not guess or hallucinate book content.',
    '- Answer in the same language the reader uses.',
    '- Be concise. Reference specific parts of the text when explaining.',
    '- If a topic spans chapters, grep across the book to find related passages.',
  ].join('\n')
}

function getOrCreateAgent(
  sessionId: string,
  systemPrompt: string,
  model: Model<Api>,
  apiKey: string,
  messages: AgentMessage[],
  webSearch: boolean,
): Agent {
  const cached = agentCache.get(sessionId)
  if (cached && cached.webSearch === webSearch) {
    log('cache hit for session %s', sessionId)
    cached.lastUsed = Date.now()
    return cached.agent
  }
  let hydrateMessages = messages
  if (cached) {
    log('webSearch changed for session %s, recreating agent', sessionId)
    hydrateMessages = cached.agent.state.messages as AgentMessage[]
    agentCache.delete(sessionId)
  }

  log('creating new agent for session %s, webSearch=%s', sessionId, webSearch)
  log('model: %s', model.id)
  log('booksDir: %s', booksDir())
  log('existing messages: %d', hydrateMessages.length)

  const tools = [...createReadOnlyTools(booksDir()), ...(webSearch ? [createWebSearchTool()] : [])]
  log('tools: %s', tools.map((t) => t.name).join(', '))

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model,
      tools,
      messages: [],
      thinkingLevel: 'off',
    },
    getApiKey: () => apiKey,
  })

  if (hydrateMessages.length > 0) {
    log('hydrating agent with %d messages', hydrateMessages.length)
    agent.replaceMessages(hydrateMessages as AgentMessage[])
  }

  agentCache.set(sessionId, { agent, lastUsed: Date.now(), webSearch })
  return agent
}

export async function sendChatMessage(opts: {
  sessionId: string
  model: Model<Api>
  apiKey: string
  userMessage: string
  systemPrompt: string
  existingMessages: unknown[]
  webSearch: boolean
  onEvent: (event: ChatSSEEvent) => void
}): Promise<unknown[]> {
  const {
    sessionId,
    model,
    apiKey,
    userMessage,
    systemPrompt,
    existingMessages,
    webSearch,
    onEvent,
  } = opts

  log('sendChatMessage session=%s model=%s webSearch=%s', sessionId, model.id, webSearch)
  log('userMessage: "%s"', userMessage.slice(0, 100))

  const agent = getOrCreateAgent(
    sessionId,
    systemPrompt,
    model,
    apiKey,
    existingMessages as AgentMessage[],
    webSearch,
  )

  let unsubscribe: (() => void) | undefined
  let eventCount = 0

  try {
    unsubscribe = agent.subscribe((event: AgentEvent) => {
      eventCount++
      switch (event.type) {
        case 'tool_execution_start':
          log('tool_start: %s args=%o', event.toolName, event.args)
          onEvent({ type: 'tool_start', tool: event.toolName, args: event.args })
          break
        case 'tool_execution_end':
          log('tool_end: %s error=%s', event.toolName, event.isError)
          onEvent({
            type: 'tool_end',
            tool: event.toolName,
            summary: event.isError ? 'Error' : 'OK',
          })
          break
        case 'message_update': {
          const ae = event.assistantMessageEvent
          if (ae.type === 'text_delta') {
            onEvent({ type: 'token', text: ae.delta })
          } else if (ae.type === 'done') {
            const u = ae.message.usage
            log('usage: in=%d out=%d total=%d', u.input, u.output, u.totalTokens)
            onEvent({ type: 'usage', input: u.input, output: u.output, total: u.totalTokens })
          }
          break
        }
        default:
          log('unhandled event type: %s', event.type)
      }
    })

    log('calling agent.prompt()...')
    await agent.prompt(userMessage)
    log(
      'agent.prompt() done, total events: %d, messages: %d',
      eventCount,
      agent.state.messages.length,
    )
    onEvent({ type: 'done' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chat agent failed'
    log('ERROR: %s', msg)
    if (err instanceof Error && err.stack) log('stack: %s', err.stack)
    onEvent({ type: 'error', message: msg })
    agentCache.delete(sessionId)
  } finally {
    unsubscribe?.()
  }

  return agent.state.messages as unknown[]
}

export function evictAgent(sessionId: string): void {
  agentCache.delete(sessionId)
}

export { buildSystemPrompt }
