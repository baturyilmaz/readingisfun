import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { getModel, type Api, type Model } from '@mariozechner/pi-ai'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as storage from '../auth/storage.js'
import { bookDir } from '../parse/storage.js'
import * as chatStorage from './chatStorage.js'
import { sendChatMessage, buildSystemPrompt, evictAgent, type ChatSSEEvent } from './chatAgent.js'

function log(msg: string, ...args: unknown[]): void {
  console.log(`[chat] ${msg}`, ...args)
}

export const chatRouter: RouterType = Router()

function p(req: Request, name: string): string {
  const v = req.params[name]
  return typeof v === 'string' ? v : ''
}

function q(req: Request, name: string): string {
  const v = req.query[name]
  return typeof v === 'string' ? v : ''
}

function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function sseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()
}

// GET /:bookId/chat/sessions?chapter=N
chatRouter.get('/:bookId/chat/sessions', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const chapter = Number(q(req, 'chapter'))
  const sessions = await chatStorage.listSessions(bookId, chapter)
  res.json({ sessions })
})

// POST /:bookId/chat/sessions
chatRouter.post('/:bookId/chat/sessions', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const { chapterNumber, provider, model, title } = req.body as {
    chapterNumber: number
    provider: string
    model: string
    title?: string
  }
  const session = await chatStorage.createSession(bookId, chapterNumber, provider, model, title)
  res.json(session)
})

// DELETE /:bookId/chat/sessions/:sessionId?chapter=N
chatRouter.delete('/:bookId/chat/sessions/:sessionId', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const sessionId = p(req, 'sessionId')
  const chapter = Number(q(req, 'chapter'))
  evictAgent(sessionId)
  await chatStorage.deleteSession(bookId, chapter, sessionId)
  res.json({ ok: true })
})

// GET /:bookId/chat/sessions/:sessionId/history?chapter=N
chatRouter.get('/:bookId/chat/sessions/:sessionId/history', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const sessionId = p(req, 'sessionId')
  const chapter = Number(q(req, 'chapter'))
  const session = await chatStorage.loadSession(bookId, chapter, sessionId)
  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  res.json({ messages: session.messages })
})

// POST /:bookId/chat/sessions/:sessionId/message — SSE stream
chatRouter.post(
  '/:bookId/chat/sessions/:sessionId/message',
  async (req: Request, res: Response) => {
    const bookId = p(req, 'bookId')
    const sessionId = p(req, 'sessionId')
    const {
      content,
      provider,
      model: modelId,
      chapterNumber,
      webSearch,
    } = req.body as {
      content: string
      provider: string
      model: string
      chapterNumber: number
      webSearch?: boolean
    }

    log(
      'POST /%s/chat/sessions/%s/message provider=%s model=%s',
      bookId,
      sessionId,
      provider,
      modelId,
    )

    const session = await chatStorage.loadSession(bookId, chapterNumber, sessionId)
    if (!session) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    const apiKey = await storage.getApiKey(provider)
    if (!apiKey) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    let model: Model<Api>
    try {
      model = getModel(provider as Parameters<typeof getModel>[0], modelId as never) as Model<Api>
    } catch {
      res.status(400).json({ error: 'Model not found' })
      return
    }

    // Load chapter metadata for system prompt
    let chapterData: { title: string }
    try {
      const metaPath = join(
        bookDir(bookId),
        'chapters',
        String(session.chapterNumber),
        'metadata.json',
      )
      const raw = await readFile(metaPath, 'utf-8')
      chapterData = JSON.parse(raw)
    } catch {
      res.status(404).json({ error: 'Chapter not found' })
      return
    }

    // Load manifest for book info
    let bookTitle = bookId
    let bookAuthor = 'Unknown'
    try {
      const raw = await readFile(join(bookDir(bookId), 'manifest.json'), 'utf-8')
      const manifest = JSON.parse(raw)
      bookTitle = manifest.bookTitle ?? bookId
      bookAuthor = manifest.bookAuthor ?? 'Unknown'
    } catch {
      /* use defaults */
    }

    const systemPrompt = buildSystemPrompt({
      bookTitle,
      bookAuthor,
      bookId,
      chapterNumber: session.chapterNumber,
      chapterTitle: chapterData.title,
    })

    sseHeaders(res)

    const ac = new AbortController()
    req.on('close', () => {
      log('client disconnected')
      ac.abort()
    })

    try {
      const updatedMessages = await sendChatMessage({
        sessionId,
        model,
        apiKey,
        userMessage: content,
        systemPrompt,
        existingMessages: session.messages,
        webSearch: !!webSearch,
        onEvent: (event: ChatSSEEvent) => {
          if (ac.signal.aborted) return
          sendSSE(res, event.type, event)
        },
      })

      session.messages = updatedMessages
      await chatStorage.saveSession(session)
    } catch (err) {
      if (!ac.signal.aborted) {
        const msg = err instanceof Error ? err.message : 'Chat failed'
        log('error: %s', msg)
        sendSSE(res, 'error', { message: msg })
      }
    } finally {
      res.end()
    }
  },
)
