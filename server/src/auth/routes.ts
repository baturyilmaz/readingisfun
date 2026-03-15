import { Router, type Request, type Response, type Router as RouterType } from 'express'
import {
  getOAuthProvider,
  getOAuthProviders,
  type OAuthLoginCallbacks,
} from '@mariozechner/pi-ai/oauth'
import { completeSimple, getModel, getModels, type Api, type Model } from '@mariozechner/pi-ai'
import * as storage from './storage.js'

function log(msg: string, ...args: unknown[]): void {
  console.log(`[auth] ${msg}`, ...args)
}

export const authRouter: RouterType = Router()

const pendingPrompts = new Map<string, (code: string) => void>()
const activeLogins = new Map<string, AbortController>()

function param(req: Request, name: string): string {
  const v = req.params[name]
  return Array.isArray(v) ? v[0] : v
}

function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// GET /status — provider list with connection status
authRouter.get('/status', async (_req: Request, res: Response) => {
  log('GET /status')
  const providers = getOAuthProviders()
  const creds = await storage.list()
  const result = providers.map((p) => ({ id: p.id, name: p.name, connected: p.id in creds }))
  log('status:', result.map((p) => `${p.id}:${p.connected}`).join(', '))
  res.json({ providers: result })
})

// GET /models/:providerId — list models for a provider
authRouter.get('/models/:providerId', (_req: Request, res: Response) => {
  const providerId = param(_req, 'providerId')
  log('GET /models/%s', providerId)
  const models = getModels(providerId as Parameters<typeof getModels>[0])
  const result = models.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    contextWindow: m.contextWindow,
    maxTokens: m.maxTokens,
    inputCost: m.cost.input,
    outputCost: m.cost.output,
  }))
  log('models for %s: %d found', providerId, result.length)
  res.json({ models: result })
})

// GET /login/:providerId — SSE stream for OAuth flow
authRouter.get('/login/:providerId', async (req: Request, res: Response) => {
  const providerId = param(req, 'providerId')
  log('GET /login/%s — starting OAuth flow', providerId)
  const provider = getOAuthProvider(providerId)
  if (!provider) {
    log('unknown provider: %s', providerId)
    res.status(404).json({ error: 'Unknown provider' })
    return
  }

  // Abort previous login for this provider
  if (activeLogins.has(providerId)) log('aborting previous login for %s', providerId)
  activeLogins.get(providerId)?.abort()

  const ac = new AbortController()
  activeLogins.set(providerId, ac)

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  req.on('close', () => {
    log('%s — client disconnected', providerId)
    ac.abort()
  })

  const callbacks: OAuthLoginCallbacks = {
    onAuth(info) {
      const isDevice = info.instructions?.startsWith('Enter code:')
      const event = isDevice ? 'device_code' : 'auth_url'
      log('%s — onAuth → %s: %s %s', providerId, event, info.url, info.instructions ?? '')
      if (isDevice) {
        const code = info.instructions!.replace('Enter code: ', '')
        sendSSE(res, 'device_code', { code, url: info.url })
      } else {
        sendSSE(res, 'auth_url', { url: info.url, instructions: info.instructions })
      }
    },
    onPrompt(prompt) {
      log('%s — onPrompt: %s', providerId, JSON.stringify(prompt))
      sendSSE(res, 'prompt', prompt)
      return new Promise<string>((resolve) => {
        pendingPrompts.set(providerId, resolve)
      })
    },
    onProgress(message) {
      log('%s — onProgress: %s', providerId, message)
      sendSSE(res, 'progress', { message })
    },
    onManualCodeInput() {
      log('%s — onManualCodeInput (fallback)', providerId)
      sendSSE(res, 'prompt', {
        message: 'Paste the authorization code from your browser',
        placeholder: 'Authorization code',
      })
      return new Promise<string>((resolve) => {
        pendingPrompts.set(providerId, resolve)
      })
    },
    signal: ac.signal,
  }

  try {
    const credentials = await provider.login(callbacks)
    log('%s — login success, saving credentials', providerId)
    await storage.set(providerId, credentials)
    sendSSE(res, 'success', { providerId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed'
    log('%s — login error: %s', providerId, msg)
    if (!ac.signal.aborted) {
      sendSSE(res, 'error', { message: msg })
    }
  } finally {
    activeLogins.delete(providerId)
    pendingPrompts.delete(providerId)
    res.end()
  }
})

// POST /prompt/:providerId — resolve pending prompt
authRouter.post('/prompt/:providerId', (req: Request, res: Response) => {
  const providerId = param(req, 'providerId')
  const { code } = req.body as { code: string }
  log('POST /prompt/%s — code: "%s"', providerId, code || '(empty)')
  const resolve = pendingPrompts.get(providerId)
  if (!resolve) {
    log('%s — no pending prompt found', providerId)
    res.status(404).json({ error: 'No pending prompt' })
    return
  }
  resolve(code)
  pendingPrompts.delete(providerId)
  res.json({ ok: true })
})

// POST /test-model — verify a model works with stored credentials
authRouter.post('/test-model', async (req: Request, res: Response) => {
  const { providerId, modelId } = req.body as { providerId: string; modelId: string }
  log('POST /test-model — provider: %s, model: %s', providerId, modelId)

  const apiKey = await storage.getApiKey(providerId)
  if (!apiKey) {
    log('test-model — no credentials for %s', providerId)
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  try {
    const model = getModel(
      providerId as Parameters<typeof getModel>[0],
      modelId as never,
    ) as Model<Api>
    if (!model) {
      res.status(404).json({ error: 'Model not found' })
      return
    }

    const start = Date.now()
    const response = await completeSimple(
      model,
      {
        systemPrompt: 'Reply in one short sentence.',
        messages: [
          {
            role: 'user',
            content: 'Say hello and confirm you are working.',
            timestamp: Date.now(),
          },
        ],
      },
      { maxTokens: 100, apiKey },
    )

    const text = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')
    const elapsed = Date.now() - start

    log('test-model — success in %dms: "%s"', elapsed, text)
    log('test-model — usage: %o', response.usage)

    res.json({
      ok: true,
      text,
      model: response.model,
      usage: response.usage,
      elapsed,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Model test failed'
    log('test-model — error: %s', msg)
    res.status(500).json({ error: msg })
  }
})

// POST /logout/:providerId — remove credentials
authRouter.post('/logout/:providerId', async (req: Request, res: Response) => {
  const providerId = param(req, 'providerId')
  log('POST /logout/%s', providerId)
  await storage.remove(providerId)
  const providers = getOAuthProviders()
  const creds = await storage.list()
  res.json({
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.id in creds,
    })),
  })
})
