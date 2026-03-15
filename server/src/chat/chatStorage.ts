import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chapterDir } from '../parse/storage.js'

export type ChatSession = {
  id: string
  bookId: string
  chapterNumber: number
  title: string
  provider: string
  model: string
  messages: unknown[]
  createdAt: string
  updatedAt: string
}

export type SessionSummary = {
  id: string
  chapterNumber: number
  title: string
  createdAt: string
  updatedAt: string
}

function chatsDir(bookId: string, chapterNumber: number): string {
  return join(chapterDir(bookId, chapterNumber), 'chats')
}

function sessionPath(bookId: string, chapterNumber: number, sessionId: string): string {
  return join(chatsDir(bookId, chapterNumber), `${sessionId}.json`)
}

function generateId(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
}

export async function listSessions(
  bookId: string,
  chapterNumber: number,
): Promise<SessionSummary[]> {
  const dir = chatsDir(bookId, chapterNumber)
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return []
  }
  const results: SessionSummary[] = []
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    try {
      const raw = await readFile(join(dir, f), 'utf-8')
      const s = JSON.parse(raw) as ChatSession
      results.push({
        id: s.id,
        chapterNumber: s.chapterNumber,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
    } catch {
      /* skip corrupt */
    }
  }
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function createSession(
  bookId: string,
  chapterNumber: number,
  provider: string,
  model: string,
  title?: string,
): Promise<ChatSession> {
  const dir = chatsDir(bookId, chapterNumber)
  await mkdir(dir, { recursive: true })
  const id = generateId()
  const session: ChatSession = {
    id,
    bookId,
    chapterNumber,
    title:
      title ??
      new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    provider,
    model,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await writeFile(sessionPath(bookId, chapterNumber, id), JSON.stringify(session, null, 2), 'utf-8')
  return session
}

export async function loadSession(
  bookId: string,
  chapterNumber: number,
  sessionId: string,
): Promise<ChatSession | null> {
  try {
    const raw = await readFile(sessionPath(bookId, chapterNumber, sessionId), 'utf-8')
    return JSON.parse(raw) as ChatSession
  } catch {
    return null
  }
}

export async function saveSession(session: ChatSession): Promise<void> {
  session.updatedAt = new Date().toISOString()
  const dir = chatsDir(session.bookId, session.chapterNumber)
  await mkdir(dir, { recursive: true })
  await writeFile(
    sessionPath(session.bookId, session.chapterNumber, session.id),
    JSON.stringify(session, null, 2),
    'utf-8',
  )
}

export async function deleteSession(
  bookId: string,
  chapterNumber: number,
  sessionId: string,
): Promise<void> {
  try {
    await unlink(sessionPath(bookId, chapterNumber, sessionId))
  } catch {
    /* ignore */
  }
}
