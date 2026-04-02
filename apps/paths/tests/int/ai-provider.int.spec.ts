// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProvider, getAvailableProviders, clearProviderCache } from '@/ai/provider'
import { getModelConfig, estimateCost } from '@/ai/models'

describe('AI Provider', () => {
  beforeEach(() => {
    clearProviderCache()
    vi.stubEnv('AI_PROVIDER_DEFAULT_BASE_URL', 'https://api.together.xyz/v1')
    vi.stubEnv('AI_PROVIDER_DEFAULT_API_KEY', 'test-key-default')
    vi.stubEnv('AI_PROVIDER_OPENAI_BASE_URL', 'https://api.openai.com/v1')
    vi.stubEnv('AI_PROVIDER_OPENAI_API_KEY', 'test-key-openai')
  })

  describe('getProvider', () => {
    it('returns an OpenAI client for the default provider', () => {
      const client = getProvider()
      expect(client).toBeDefined()
      expect(client.baseURL).toBe('https://api.together.xyz/v1')
    })

    it('returns an OpenAI client for a named provider', () => {
      const client = getProvider('openai')
      expect(client).toBeDefined()
      expect(client.baseURL).toBe('https://api.openai.com/v1')
    })

    it('throws if provider is not configured', () => {
      expect(() => getProvider('nonexistent')).toThrow('AI provider "nonexistent" is not configured')
    })
  })

  describe('getAvailableProviders', () => {
    it('lists configured providers', () => {
      const providers = getAvailableProviders()
      expect(providers).toContain('default')
      expect(providers).toContain('openai')
    })
  })
})

describe('Model Registry', () => {
  describe('getModelConfig', () => {
    it('returns config for tutor use case', () => {
      const config = getModelConfig('tutor')
      expect(config).toBeDefined()
      expect(config.provider).toBe('default')
      expect(config.model).toBeDefined()
      expect(config.maxOutputTokens).toBeGreaterThan(0)
    })

    it('returns config for quiz generation use case', () => {
      const config = getModelConfig('quizGeneration')
      expect(config).toBeDefined()
      expect(config.maxOutputTokens).toBeGreaterThan(0)
    })

    it('throws for unknown use case', () => {
      expect(() => getModelConfig('nonexistent')).toThrow('No model configured for use case "nonexistent"')
    })
  })

  describe('estimateCost', () => {
    it('calculates cost from token counts', () => {
      const cost = estimateCost('tutor', 100, 200)
      expect(cost).toBeGreaterThanOrEqual(0)
      expect(typeof cost).toBe('number')
    })
  })
})
