import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import { parseDocument } from 'htmlparser2'
import { textContent } from 'domutils'
import {
  ensureChapterDir,
  ensureImagesDir,
  imagesDir,
  writeManifest,
  type BookManifest,
  type ChapterEntry,
} from './storage.js'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.tiff'])

export type ParseEvent =
  | { type: 'log'; message: string }
  | { type: 'done'; bookId: string }
  | { type: 'error'; message: string }

type ParseOpts = { filePath: string; onEvent: (event: ParseEvent) => void }

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

function resolveHref(base: string, href: string): string {
  const dir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : ''
  return dir + href
}

export async function parseEpub({ filePath, onEvent }: ParseOpts): Promise<string> {
  const emit = (msg: string) => onEvent({ type: 'log', message: msg })

  emit('Reading EPUB file...')
  const buf = await readFile(filePath)
  const zip = await JSZip.loadAsync(buf)

  // 1. Container → OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml')
  const opfPath = extractAttr(containerXml, 'rootfile', 'full-path')
  if (!opfPath) throw new Error('Invalid EPUB: no rootfile')

  // 2. Parse OPF metadata
  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) throw new Error(`Invalid EPUB: missing ${opfPath}`)
  const metadata = extractMetadata(opfXml)
  const bookId = slugify(metadata.title || 'untitled')
  emit(`Book: "${metadata.title}" by ${metadata.author}`)

  // 3. Manifest + spine
  const manifestItems = extractManifestItems(opfXml)
  const spineIds = extractSpineIds(opfXml)
  const spineHrefs = spineIds.map((id) => manifestItems.get(id)).filter(Boolean) as string[]
  const resolvedHrefs = spineHrefs.map((href) => resolveHref(opfPath, href))

  // 4. TOC titles
  const tocTitles = await extractTocTitles(zip, opfXml, opfPath)

  // 5. Cover image
  const coverImage = extractCoverImage(opfXml, manifestItems)
  if (coverImage) emit(`Cover image: ${coverImage}`)

  // 6. Extract all images
  const imageMap = new Map<string, string>()
  await ensureImagesDir(bookId)
  const imgDir = imagesDir(bookId)
  let imageCount = 0
  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue
    const ext = zipPath.slice(zipPath.lastIndexOf('.')).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) continue
    const imgName = zipPath.split('/').pop() ?? zipPath
    await writeFile(join(imgDir, imgName), await zipEntry.async('nodebuffer'))
    imageMap.set(zipPath, imgName)
    imageCount++
  }
  if (imageCount > 0) emit(`Extracted ${imageCount} images`)

  // 7. Build href → chapter number map (first pass)
  const hrefToChapter = new Map<string, number>()
  const navIds = extractNavIds(opfXml)
  type SpineItem = { idx: number; href: string; spineHref: string; num: number }
  const items: SpineItem[] = []
  let num = 0

  for (let i = 0; i < resolvedHrefs.length; i++) {
    if (navIds.has(spineIds[i])) continue
    const href = resolvedHrefs[i]
    if (!zip.file(href)) continue
    num++
    items.push({ idx: i, href, spineHref: spineHrefs[i], num })
    hrefToChapter.set(href, num)
    hrefToChapter.set(spineHrefs[i], num)
    hrefToChapter.set(href.split('/').pop() ?? href, num)
  }

  // 8. Process each spine item
  const chapters: ChapterEntry[] = []
  for (const item of items) {
    const raw = await zip.file(item.href)?.async('string')
    if (!raw) continue

    let body = extractBody(raw)
    body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

    const fileName = item.href.split('/').pop() ?? item.href
    const plainText = htmlToText(body)
    const wordCount = plainText.split(/\s+/).filter(Boolean).length
    const title =
      tocTitles.get(item.spineHref) ??
      tocTitles.get(fileName) ??
      extractHtmlTitle(body) ??
      `Section ${item.num}`

    // Rewrite links
    const hrefDir = item.href.includes('/') ? item.href.slice(0, item.href.lastIndexOf('/') + 1) : ''
    body = body.replace(/(<a\s[^>]*href=")([^"]*)/gi, (_m, prefix, href) => {
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return `${prefix}${href}`
      const target = href.split('#')[0]
      const resolved = target.startsWith('/') ? target : hrefDir + target
      const ch = hrefToChapter.get(resolved) ?? hrefToChapter.get(target) ?? hrefToChapter.get(target.split('/').pop() ?? target)
      return ch ? `${prefix}#readingisfun-chapter-${ch}` : `${prefix}${href}`
    })

    // Rewrite images
    const chapterImages: string[] = []
    body = body.replace(/(<img\s[^>]*src=")([^"]*)/gi, (_m, prefix, src) => {
      const resolvedSrc = src.startsWith('/') || src.startsWith('http') ? src : hrefDir + src
      const imgName = imageMap.get(resolvedSrc) ?? findImageByName(imageMap, src)
      if (imgName) {
        if (!chapterImages.includes(imgName)) chapterImages.push(imgName)
        return `${prefix}/api/books/${bookId}/images/${imgName}`
      }
      return `${prefix}${src}`
    })

    emit(`${item.num}: "${title}" (${wordCount} words${chapterImages.length ? `, ${chapterImages.length} images` : ''})`)

    await ensureChapterDir(bookId, item.num)
    const dir = (await import('./storage.js')).chapterDir(bookId, item.num)
    await Promise.all([
      writeFile(`${dir}/raw.html`, body, 'utf-8'),
      writeFile(`${dir}/metadata.json`, JSON.stringify({ number: item.num, title, sourceFile: fileName, wordCount, images: chapterImages }, null, 2), 'utf-8'),
    ])

    chapters.push({ number: item.num, title, sourceFile: fileName, wordCount, images: chapterImages })
  }

  if (chapters.length === 0) throw new Error('No chapters found in EPUB')

  // 9. Write manifest
  const epubFileName = filePath.split('/').pop() ?? filePath
  const manifest: BookManifest = {
    bookId,
    bookTitle: metadata.title,
    bookAuthor: metadata.author,
    language: metadata.language,
    coverImage: coverImage ? imageMap.get(resolveHref(opfPath, coverImage)) ?? null : null,
    epubFile: epubFileName,
    totalChapters: chapters.length,
    parsedAt: new Date().toISOString(),
    chapters,
  }
  await writeManifest(manifest)

  emit(`Done! ${chapters.length} chapters imported.`)
  onEvent({ type: 'done', bookId })
  return bookId
}

// --- Helpers ---

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return m ? m[1] : html
}

function extractHtmlTitle(html: string): string | null {
  for (const tag of ['h1', 'h2', 'h3']) {
    const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
    if (m) {
      const text = m[1].replace(/<[^>]*>/g, '').trim()
      if (text.length > 0 && text.length < 200) return text
    }
  }
  return null
}

function htmlToText(html: string): string {
  const doc = parseDocument(html)
  return textContent(doc).replace(/\s+/g, ' ').trim()
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  return xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'))?.[1] ?? null
}

function extractMetadata(opfXml: string) {
  return {
    title: opfXml.match(/<dc:title[^>]*>([^<]*)<\/dc:title>/i)?.[1]?.trim() ?? 'Untitled',
    author: opfXml.match(/<dc:creator[^>]*>([^<]*)<\/dc:creator>/i)?.[1]?.trim() ?? 'Unknown',
    language: opfXml.match(/<dc:language[^>]*>([^<]*)<\/dc:language>/i)?.[1]?.trim() ?? 'en',
  }
}

function extractManifestItems(opfXml: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /<item\s([^>]*)>/gi
  let m
  while ((m = re.exec(opfXml))) {
    const attrs = m[1]
    const id = attrs.match(/id="([^"]*)"/)?.[1]
    const href = attrs.match(/href="([^"]*)"/)?.[1]
    if (id && href) map.set(id, href)
  }
  return map
}

function extractSpineIds(opfXml: string): string[] {
  const ids: string[] = []
  const re = /<itemref\s[^>]*idref="([^"]*)"/gi
  let m
  while ((m = re.exec(opfXml))) ids.push(m[1])
  return ids
}

function extractNavIds(opfXml: string): Set<string> {
  const ids = new Set<string>()
  const re = /<item\s([^>]*)>/gi
  let m
  while ((m = re.exec(opfXml))) {
    const attrs = m[1]
    if (/properties="[^"]*nav[^"]*"/i.test(attrs)) {
      const id = attrs.match(/id="([^"]*)"/)?.[1]
      if (id) ids.add(id)
    }
  }
  return ids
}

function findImageByName(imageMap: Map<string, string>, src: string): string | null {
  const name = src.split('/').pop() ?? src
  for (const [, saved] of imageMap) {
    if (saved === name) return saved
  }
  return null
}

async function extractTocTitles(zip: JSZip, opfXml: string, opfPath: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>()

  // NCX
  const ncxId = opfXml.match(/<spine[^>]*toc="([^"]*)"/i)?.[1]
  if (ncxId) {
    const items = extractManifestItems(opfXml)
    const ncxHref = items.get(ncxId)
    if (ncxHref) {
      const ncxXml = await zip.file(resolveHref(opfPath, ncxHref))?.async('string')
      if (ncxXml) {
        const re = /<navPoint[^>]*>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\s[^>]*src="([^"]*)"[^>]*\/>[\s\S]*?<\/navPoint>/gi
        let m
        while ((m = re.exec(ncxXml))) {
          const label = m[1].replace(/<[^>]*>/g, '').trim()
          if (label) titles.set(m[2].split('#')[0], label)
        }
      }
    }
  }

  // EPUB3 nav fallback
  if (titles.size === 0) {
    let navHref: string | undefined
    const re = /<item\s([^>]*)>/gi
    let m
    while ((m = re.exec(opfXml))) {
      if (/properties="[^"]*nav[^"]*"/i.test(m[1])) {
        navHref = m[1].match(/href="([^"]*)"/)?.[1]
        break
      }
    }
    if (navHref) {
      const navXml = await zip.file(resolveHref(opfPath, navHref))?.async('string')
      if (navXml) {
        const aRe = /<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
        while ((m = aRe.exec(navXml))) {
          const label = m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          if (label) titles.set(m[1].split('#')[0], label)
        }
      }
    }
  }

  return titles
}

function extractCoverImage(opfXml: string, manifestItems: Map<string, string>): string | null {
  const metaCover = opfXml.match(/<meta\s[^>]*name="cover"[^>]*content="([^"]*)"/i)?.[1]
  if (metaCover) {
    const href = manifestItems.get(metaCover)
    if (href) return href
  }
  const re = /<item\s([^>]*)>/gi
  let m
  while ((m = re.exec(opfXml))) {
    if (/properties="[^"]*cover-image[^"]*"/i.test(m[1])) {
      return m[1].match(/href="([^"]*)"/)?.[1] ?? null
    }
  }
  return null
}
