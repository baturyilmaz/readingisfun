import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { lock } from 'proper-lockfile'
import { getOAuthApiKey, type OAuthCredentials } from '@mariozechner/pi-ai/oauth'

const AUTH_DIR = join(homedir(), '.readingisfun')
const AUTH_FILE = join(AUTH_DIR, 'auth.json')

type CredentialsMap = Record<string, OAuthCredentials>

async function ensureDir(): Promise<void> {
  await mkdir(AUTH_DIR, { recursive: true })
}

async function readCredentials(): Promise<CredentialsMap> {
  try {
    const data = await readFile(AUTH_FILE, 'utf-8')
    return JSON.parse(data) as CredentialsMap
  } catch {
    return {}
  }
}

async function writeCredentials(creds: CredentialsMap): Promise<void> {
  await ensureDir()
  await writeFile(AUTH_FILE, JSON.stringify(creds, null, 2), 'utf-8')
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await ensureDir()
  // Ensure the file exists before locking
  try {
    await readFile(AUTH_FILE)
  } catch {
    await writeFile(AUTH_FILE, '{}', 'utf-8')
  }
  let release: (() => Promise<void>) | undefined
  try {
    release = await lock(AUTH_FILE, { retries: 3 })
    return await fn()
  } finally {
    if (release) await release()
  }
}

export async function get(providerId: string): Promise<OAuthCredentials | null> {
  const creds = await readCredentials()
  return creds[providerId] ?? null
}

export async function set(providerId: string, credential: OAuthCredentials): Promise<void> {
  await withLock(async () => {
    const creds = await readCredentials()
    creds[providerId] = credential
    await writeCredentials(creds)
  })
}

export async function remove(providerId: string): Promise<void> {
  await withLock(async () => {
    const creds = await readCredentials()
    delete creds[providerId]
    await writeCredentials(creds)
  })
}

export async function list(): Promise<CredentialsMap> {
  return readCredentials()
}

export async function getApiKey(providerId: string): Promise<string | null> {
  const allCreds = await readCredentials()
  if (!allCreds[providerId]) return null

  const result = await getOAuthApiKey(providerId, allCreds)
  if (!result) return null

  // Persist refreshed credentials if they changed
  if (result.newCredentials !== allCreds[providerId]) {
    await set(providerId, result.newCredentials)
  }

  return result.apiKey
}
