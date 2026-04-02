// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { embedText, embedBatch, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '@/ai/embeddings'

describe('Embedding adapter', () => {
  beforeEach(() => {
    vi.stubEnv('AI_PROVIDER_JINA_BASE_URL', 'https://api.jina.ai/v1')
    vi.stubEnv('AI_PROVIDER_JINA_API_KEY', 'test-key')
  })

  describe('constants', () => {
    it('exports model name', () => {
      expect(EMBEDDING_MODEL).toBe('jina-embeddings-v3')
    })

    it('exports dimensions', () => {
      expect(EMBEDDING_DIMENSIONS).toBe(1024)
    })
  })

  describe('embedText', () => {
    it('is a function', () => {
      expect(typeof embedText).toBe('function')
    })
  })

  describe('embedBatch', () => {
    it('is a function', () => {
      expect(typeof embedBatch).toBe('function')
    })
  })
})
