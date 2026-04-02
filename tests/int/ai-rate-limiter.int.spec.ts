import { describe, it, expect } from 'vitest'
import {
  isStaffRole,
  getRateLimitKey,
  getDefaultLimit,
} from '@/ai/rateLimiter'

describe('Rate limiter utilities', () => {
  describe('isStaffRole', () => {
    it('admin is staff', () => { expect(isStaffRole('admin')).toBe(true) })
    it('publisher is staff', () => { expect(isStaffRole('publisher')).toBe(true) })
    it('editor is staff', () => { expect(isStaffRole('editor')).toBe(true) })
    it('contributor is staff', () => { expect(isStaffRole('contributor')).toBe(true) })
    it('user is not staff', () => { expect(isStaffRole('user')).toBe(false) })
  })

  describe('getRateLimitKey', () => {
    it('generates correct key format', () => {
      const key = getRateLimitKey('user-123', 'tutor-chat')
      expect(key).toMatch(/^ai:ratelimit:user-123:tutor-chat:\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getDefaultLimit', () => {
    it('returns 0 for free tier tutor-chat', () => { expect(getDefaultLimit('tutor-chat', 'free')).toBe(0) })
    it('returns 10 for regular tier tutor-chat', () => { expect(getDefaultLimit('tutor-chat', 'regular')).toBe(10) })
    it('returns 50 for premium tier tutor-chat', () => { expect(getDefaultLimit('tutor-chat', 'premium')).toBe(50) })
    it('returns -1 (unlimited) for enterprise tier', () => { expect(getDefaultLimit('tutor-chat', 'enterprise')).toBe(-1) })
    it('returns 0 for unknown feature', () => { expect(getDefaultLimit('unknown-feature', 'premium')).toBe(0) })
  })
})
