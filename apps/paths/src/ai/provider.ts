import OpenAI from 'openai'

const clients = new Map<string, OpenAI>()

function getProviderEnv(name: string): { baseURL: string; apiKey: string } | null {
  const suffix = name.toUpperCase()
  const baseURL = process.env[`AI_PROVIDER_${suffix}_BASE_URL`]
  const apiKey = process.env[`AI_PROVIDER_${suffix}_API_KEY`]
  if (!baseURL || !apiKey) return null
  return { baseURL, apiKey }
}

export function getProvider(name: string = 'default'): OpenAI {
  const cached = clients.get(name)
  if (cached) return cached

  const env = getProviderEnv(name)
  if (!env) {
    throw new Error(
      `AI provider "${name}" is not configured. Set AI_PROVIDER_${name.toUpperCase()}_BASE_URL and AI_PROVIDER_${name.toUpperCase()}_API_KEY.`,
    )
  }

  const client = new OpenAI({
    baseURL: env.baseURL,
    apiKey: env.apiKey,
  })

  clients.set(name, client)
  return client
}

export function getAvailableProviders(): string[] {
  const providers: string[] = []
  for (const key of Object.keys(process.env)) {
    const match = key.match(/^AI_PROVIDER_(\w+)_BASE_URL$/)
    if (match && process.env[`AI_PROVIDER_${match[1]}_API_KEY`]) {
      providers.push(match[1].toLowerCase())
    }
  }
  return providers
}

export function clearProviderCache(): void {
  clients.clear()
}
