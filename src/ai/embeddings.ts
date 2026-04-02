import { getProvider } from './provider'

export const EMBEDDING_MODEL = 'jina-embeddings-v3'
export const EMBEDDING_DIMENSIONS = 1024

/**
 * Generate an embedding vector for a single text.
 * Uses the Jina provider via the existing provider abstraction.
 */
export async function embedText(text: string): Promise<number[]> {
  const client = getProvider('jina')
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * More efficient than calling embedText() in a loop.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const client = getProvider('jina')
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })

  // Sort by index to maintain order
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}
