import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ensureUploadsDir, uploadsDir } from './storage.js'
import { parseEpub, type ParseEvent } from './epubParser.js'

function log(msg: string, ...args: unknown[]): void {
  console.log(`[parse] ${msg}`, ...args)
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

export const parseRouter: RouterType = Router()

// POST /upload-epub — receive EPUB file as raw body
parseRouter.post('/upload-epub', async (req: Request, res: Response) => {
  log('POST /upload-epub')

  const rawFilename = req.headers['x-filename']
  if (typeof rawFilename !== 'string') {
    res.status(400).json({ error: 'Missing X-Filename header' })
    return
  }
  const filename = decodeURIComponent(rawFilename)
  if (!filename.endsWith('.epub')) {
    res.status(400).json({ error: 'Invalid filename — must be .epub' })
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const buf = Buffer.concat(chunks)

  if (buf.length > 500 * 1024 * 1024) {
    res.status(413).json({ error: 'File too large (max 500MB)' })
    return
  }

  if (buf.length === 0) {
    res.status(400).json({ error: 'Empty file' })
    return
  }

  await ensureUploadsDir()
  const dest = join(uploadsDir(), filename)
  await writeFile(dest, buf)
  log('saved %s (%d bytes)', filename, buf.length)

  res.json({ filename })
})

// GET /import-epub?filename=X — SSE: parse EPUB into book
parseRouter.get('/import-epub', async (req: Request, res: Response) => {
  const filename = typeof req.query.filename === 'string' ? req.query.filename : ''
  log('GET /import-epub?filename=%s', filename)

  if (!filename) {
    res.status(400).json({ error: 'Missing filename' })
    return
  }

  sseHeaders(res)

  const ac = new AbortController()
  req.on('close', () => {
    log('client disconnected')
    ac.abort()
  })

  try {
    const filePath = join(uploadsDir(), filename)
    await parseEpub({
      filePath,
      onEvent: (event: ParseEvent) => {
        if (ac.signal.aborted) return
        sendSSE(res, event.type, event)
      },
    })
  } catch (err) {
    if (!ac.signal.aborted) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      log('error: %s', msg)
      sendSSE(res, 'error', { message: msg })
    }
  } finally {
    res.end()
  }
})
