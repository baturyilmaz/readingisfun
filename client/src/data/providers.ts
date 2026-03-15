export type Provider = {
  id: string
  name: string
  description: string
  letter: string
}

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models via Claude Pro/Max',
    letter: 'A',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'Copilot models via GitHub',
    letter: 'G',
  },
  {
    id: 'google-gemini-cli',
    name: 'Google Gemini',
    description: 'Gemini models via Google Cloud',
    letter: 'G',
  },
  {
    id: 'google-antigravity',
    name: 'Google Antigravity',
    description: 'Multi-model via Google Cloud',
    letter: 'A',
  },
  { id: 'openai-codex', name: 'OpenAI Codex', description: 'GPT models via ChatGPT', letter: 'O' },
]
