import { describe, it, expect } from 'vitest'
import { validateInput, ValidationError } from '@/ai/guardrails'

describe('AI Guardrails', () => {
  describe('validateInput', () => {
    it('accepts valid message', () => {
      expect(() => validateInput({ message: 'What is mitochondrial function?', conversationLength: 0 })).not.toThrow()
    })
    it('rejects empty message', () => {
      expect(() => validateInput({ message: '', conversationLength: 0 })).toThrow(ValidationError)
    })
    it('rejects message exceeding max length', () => {
      const longMessage = 'a'.repeat(2001)
      expect(() => validateInput({ message: longMessage, conversationLength: 0 })).toThrow(ValidationError)
      expect(() => validateInput({ message: longMessage, conversationLength: 0 })).toThrow('exceeds maximum length')
    })
    it('rejects conversation exceeding max messages', () => {
      expect(() => validateInput({ message: 'hello', conversationLength: 51 })).toThrow(ValidationError)
      expect(() => validateInput({ message: 'hello', conversationLength: 51 })).toThrow('too many messages')
    })
    it('accepts conversation at max limit', () => {
      expect(() => validateInput({ message: 'hello', conversationLength: 50 })).not.toThrow()
    })
    it('accepts message at max length', () => {
      expect(() => validateInput({ message: 'a'.repeat(2000), conversationLength: 0 })).not.toThrow()
    })
  })
})
