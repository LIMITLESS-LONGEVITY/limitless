import { getProvider } from './provider'
import { getModelConfig } from './models'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  maxTokens?: number
  temperature?: number
}

export interface ChatResult {
  content: string
  inputTokens: number
  outputTokens: number
}

/**
 * Streaming chat — yields text chunks as they arrive.
 * Used for tutor chat (real-time responses).
 */
export async function* streamChat(
  messages: ChatMessage[],
  useCase: string,
  options?: ChatOptions,
): AsyncGenerator<string, ChatResult> {
  const config = getModelConfig(useCase)
  const client = getProvider(config.provider)

  const stream = await client.chat.completions.create({
    model: config.model,
    messages,
    max_tokens: options?.maxTokens ?? config.maxOutputTokens,
    temperature: options?.temperature ?? 0.7,
    stream: true,
    stream_options: { include_usage: true },
  })

  let content = ''
  let inputTokens = 0
  let outputTokens = 0

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      content += delta
      yield delta
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? 0
      outputTokens = chunk.usage.completion_tokens ?? 0
    }
  }

  return { content, inputTokens, outputTokens }
}

/**
 * Non-streaming chat — returns the complete response.
 * Used for quiz generation (structured JSON output).
 */
export async function chat(
  messages: ChatMessage[],
  useCase: string,
  options?: ChatOptions,
): Promise<ChatResult> {
  const config = getModelConfig(useCase)
  const client = getProvider(config.provider)

  const response = await client.chat.completions.create({
    model: config.model,
    messages,
    max_tokens: options?.maxTokens ?? config.maxOutputTokens,
    temperature: options?.temperature ?? 0.7,
    stream: false,
  })

  const content = response.choices[0]?.message?.content ?? ''
  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0

  return { content, inputTokens, outputTokens }
}
