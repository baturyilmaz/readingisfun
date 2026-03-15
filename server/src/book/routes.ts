import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { readFile, writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { bookDir, booksDir, chapterDir, imagesDir, uploadsDir } from '../parse/storage.js'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
}

function log(msg: string, ...args: unknown[]): void {
  console.log(`[book] ${msg}`, ...args)
}

export const bookRouter: RouterType = Router()

function p(req: Request, name: string): string {
  const v = req.params[name]
  return typeof v === 'string' ? v : ''
}

// GET / — list all parsed books
bookRouter.get('/', async (_req: Request, res: Response) => {
  log('GET /')
  try {
    const dirs = await readdir(booksDir(), { withFileTypes: true })
    const manifests = await Promise.all(
      dirs
        .filter((d) => d.isDirectory())
        .map(async (d) => {
          try {
            const raw = await readFile(join(booksDir(), d.name, 'manifest.json'), 'utf-8')
            return JSON.parse(raw)
          } catch {
            return null
          }
        }),
    )
    res.json({ books: manifests.filter(Boolean) })
  } catch {
    res.json({ books: [] })
  }
})

// DELETE /:bookId — delete a book and all its data
bookRouter.delete('/:bookId', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  log('DELETE /%s', bookId)
  try {
    await rm(bookDir(bookId), { recursive: true, force: true })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete book' })
  }
})

// GET /:bookId/epub — serve the original EPUB file for react-reader
bookRouter.get('/:bookId/epub', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  try {
    const raw = await readFile(join(booksDir(), bookId, 'manifest.json'), 'utf-8')
    const manifest = JSON.parse(raw)
    const epubPath = join(uploadsDir(), manifest.epubFile)
    await stat(epubPath)
    res.setHeader('Content-Type', 'application/epub+zip')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(await readFile(epubPath))
  } catch {
    res.status(404).json({ error: 'EPUB file not found' })
  }
})

// GET /:bookId/manifest
bookRouter.get('/:bookId/manifest', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  log('GET /%s/manifest', bookId)
  try {
    const data = await readFile(join(booksDir(), bookId, 'manifest.json'), 'utf-8')
    res.json(JSON.parse(data))
  } catch {
    res.status(404).json({ error: 'Book not found' })
  }
})

// GET /:bookId/chapters/:number
bookRouter.get('/:bookId/chapters/:number', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const num = Number(p(req, 'number'))
  log('GET /%s/chapters/%s', bookId, num)

  const dir = chapterDir(bookId, num)
  try {
    const [metaRaw, content] = await Promise.all([
      readFile(join(dir, 'metadata.json'), 'utf-8'),
      readFile(join(dir, 'raw.html'), 'utf-8'),
    ])
    const meta = JSON.parse(metaRaw)

    res.json({
      number: meta.number,
      title: meta.title,
      sourceFile: meta.sourceFile,
      content,
      formattedContent: null,
    })
  } catch {
    res.status(404).json({ error: 'Chapter not found' })
  }
})

// GET /:bookId/notes/:number
bookRouter.get('/:bookId/notes/:number', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const num = Number(p(req, 'number'))
  try {
    const content = await readFile(join(chapterDir(bookId, num), 'notes.md'), 'utf-8')
    res.json({ content })
  } catch {
    res.json({ content: '' })
  }
})

// PUT /:bookId/notes/:number
bookRouter.put('/:bookId/notes/:number', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const num = Number(p(req, 'number'))
  const { content } = req.body as { content: string }
  const dir = chapterDir(bookId, num)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'notes.md'), content ?? '', 'utf-8')
  res.json({ ok: true })
})

// GET /:bookId/highlights/:number
bookRouter.get('/:bookId/highlights/:number', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const num = Number(p(req, 'number'))
  try {
    const raw = await readFile(join(chapterDir(bookId, num), 'highlights.json'), 'utf-8')
    res.json(JSON.parse(raw))
  } catch {
    res.json({ highlights: [] })
  }
})

// PUT /:bookId/highlights/:number
bookRouter.put('/:bookId/highlights/:number', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const num = Number(p(req, 'number'))
  const dir = chapterDir(bookId, num)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'highlights.json'), JSON.stringify(req.body), 'utf-8')
  res.json({ ok: true })
})

// GET /:bookId/progress
bookRouter.get('/:bookId/progress', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  try {
    const raw = await readFile(join(booksDir(), bookId, 'progress.json'), 'utf-8')
    res.json(JSON.parse(raw))
  } catch {
    res.json({ percentage: 0, lastLocation: null })
  }
})

// PUT /:bookId/progress
bookRouter.put('/:bookId/progress', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const { percentage, lastLocation } = req.body as { percentage: number; lastLocation: string | null }
  await writeFile(join(booksDir(), bookId, 'progress.json'), JSON.stringify({ percentage, lastLocation }), 'utf-8')
  res.json({ ok: true })
})

// GET /:bookId/images/:filename — serve book images
bookRouter.get('/:bookId/images/:filename', async (req: Request, res: Response) => {
  const bookId = p(req, 'bookId')
  const filename = p(req, 'filename')

  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    res.status(400).json({ error: 'Invalid filename' })
    return
  }

  const filePath = join(imagesDir(bookId), filename)
  try {
    await stat(filePath)
    const ext = extname(filename).toLowerCase()
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream'
    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    const buf = await readFile(filePath)
    res.send(buf)
  } catch {
    res.status(404).json({ error: 'Image not found' })
  }
})
