import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BASE_DIR = join(homedir(), '.readingisfun')

export function baseDir(): string {
  return BASE_DIR
}

export function uploadsDir(): string {
  return join(BASE_DIR, 'uploads')
}

export function booksDir(): string {
  return join(BASE_DIR, 'books')
}

export function bookDir(bookId: string): string {
  return join(BASE_DIR, 'books', bookId)
}

export function chaptersDir(bookId: string): string {
  return join(bookDir(bookId), 'chapters')
}

export function chapterDir(bookId: string, num: number): string {
  return join(chaptersDir(bookId), String(num))
}

export function manifestPath(bookId: string): string {
  return join(bookDir(bookId), 'manifest.json')
}

export async function ensureBookDir(bookId: string): Promise<void> {
  await mkdir(chaptersDir(bookId), { recursive: true })
}

export async function ensureChapterDir(bookId: string, num: number): Promise<void> {
  await mkdir(chapterDir(bookId, num), { recursive: true })
}

export function imagesDir(bookId: string): string {
  return join(bookDir(bookId), 'images')
}

export async function ensureImagesDir(bookId: string): Promise<void> {
  await mkdir(imagesDir(bookId), { recursive: true })
}

export async function ensureUploadsDir(): Promise<void> {
  await mkdir(uploadsDir(), { recursive: true })
}

export type BookManifest = {
  bookId: string
  bookTitle: string
  bookAuthor: string
  language: string
  coverImage: string | null
  epubFile: string
  totalChapters: number
  parsedAt: string
  chapters: ChapterEntry[]
}

export type ChapterEntry = {
  number: number
  title: string
  sourceFile: string
  wordCount: number
  images: string[]
}

export type ChapterData = {
  number: number
  title: string
  sourceFile: string
  content: string
  formattedContent: string | null
}

export async function readManifest(bookId: string): Promise<BookManifest | null> {
  try {
    const raw = await readFile(manifestPath(bookId), 'utf-8')
    return JSON.parse(raw) as BookManifest
  } catch {
    return null
  }
}

export async function writeManifest(manifest: BookManifest): Promise<void> {
  await ensureBookDir(manifest.bookId)
  await writeFile(manifestPath(manifest.bookId), JSON.stringify(manifest, null, 2), 'utf-8')
}
