import { describe, it, expect } from 'vitest'
import { calculateCompletionPercentage } from '@/hooks/updateEnrollmentProgress'

describe('Enrollment flow', () => {
  describe('calculateCompletionPercentage edge cases', () => {
    it('0 of 0 returns 0 (no division by zero)', () => {
      expect(calculateCompletionPercentage(0, 0)).toBe(0)
    })

    it('0 of 10 returns 0', () => {
      expect(calculateCompletionPercentage(0, 10)).toBe(0)
    })

    it('10 of 10 returns 100', () => {
      expect(calculateCompletionPercentage(10, 10)).toBe(100)
    })

    it('3 of 7 returns 43 (rounds correctly)', () => {
      expect(calculateCompletionPercentage(3, 7)).toBe(43)
    })

    it('1 of 3 returns 33 (rounds down)', () => {
      expect(calculateCompletionPercentage(1, 3)).toBe(33)
    })

    it('2 of 3 returns 67 (rounds up)', () => {
      expect(calculateCompletionPercentage(2, 3)).toBe(67)
    })

    it('1 of 1 returns 100', () => {
      expect(calculateCompletionPercentage(1, 1)).toBe(100)
    })

    it('1 of 2 returns 50', () => {
      expect(calculateCompletionPercentage(1, 2)).toBe(50)
    })

    it('99 of 100 returns 99', () => {
      expect(calculateCompletionPercentage(99, 100)).toBe(99)
    })

    it('1 of 100 returns 1', () => {
      expect(calculateCompletionPercentage(1, 100)).toBe(1)
    })

    it('large numbers work correctly', () => {
      expect(calculateCompletionPercentage(500, 1000)).toBe(50)
      expect(calculateCompletionPercentage(333, 1000)).toBe(33)
    })

    it('boundary: just over half rounds to 50 or 51', () => {
      // 5.01 / 10 = 50.1 → rounds to 50
      // But with integers: 501/1000 = 50.1 → 50
      expect(calculateCompletionPercentage(501, 1000)).toBe(50)
    })

    it('boundary: just under half rounds correctly', () => {
      // 499/1000 = 49.9 → 50
      expect(calculateCompletionPercentage(499, 1000)).toBe(50)
    })
  })
})
