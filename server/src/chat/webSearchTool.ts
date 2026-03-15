import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@sinclair/typebox'

const EXA_API_URL = 'https://api.exa.ai/search'

const schema = Type.Object({
  query: Type.String({ description: 'Search query to find relevant web content' }),
})

type SearchResult = {
  title: string
  url: string
  highlights?: string[]
}

export function createWebSearchTool(): AgentTool<typeof schema> {
  return {
    name: 'web_search',
    label: 'Web Search',
    description:
      'Search the web for current information. Use when the reader asks about something not covered in the book, or when you need up-to-date information.',
    parameters: schema,
    execute: async (_toolCallId, { query }, signal) => {
      const res = await fetch(EXA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXA_API_KEY ?? '',
        },
        body: JSON.stringify({
          query,
          numResults: 5,
          type: 'auto',
          contents: { highlights: { maxCharacters: 3000 } },
        }),
        signal,
      })

      if (!res.ok) {
        const msg = await res.text().catch(() => 'Unknown error')
        return {
          content: [{ type: 'text' as const, text: `Search failed: ${msg}` }],
          details: undefined,
        }
      }

      const data = (await res.json()) as { results: SearchResult[] }
      const text = data.results
        .map((r, i) => {
          const highlights = r.highlights?.join('\n') ?? ''
          return `[${i + 1}] ${r.title}\n${r.url}\n${highlights}`
        })
        .join('\n\n')

      return {
        content: [{ type: 'text' as const, text: text || 'No results found.' }],
        details: undefined,
      }
    },
  }
}
