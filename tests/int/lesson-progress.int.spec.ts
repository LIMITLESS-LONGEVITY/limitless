import { describe, it, expect } from 'vitest'
import { calculateCompletionPercentage } from '@/hooks/updateEnrollmentProgress'

describe('Progress calculation', () => {
  describe('calculateCompletionPercentage', () => {
    it('returns 0 when no lessons completed', () => {
      expect(calculateCompletionPercentage(0, 10)).toBe(0)
    })

    it('returns 50 when half completed', () => {
      expect(calculateCompletionPercentage(5, 10)).toBe(50)
    })

    it('returns 100 when all completed', () => {
      expect(calculateCompletionPercentage(10, 10)).toBe(100)
    })

    it('returns 0 when total is 0 (no lessons)', () => {
      expect(calculateCompletionPercentage(0, 0)).toBe(0)
    })

    it('rounds to nearest integer', () => {
      expect(calculateCompletionPercentage(1, 3)).toBe(33)
      expect(calculateCompletionPercentage(2, 3)).toBe(67)
    })
  })
})
