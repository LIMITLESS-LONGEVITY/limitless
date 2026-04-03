import { describe, it, expect } from 'vitest'
import { getEffectiveAccessLevels, higherOf } from '@/utilities/accessLevels'

describe('Access level logic', () => {
  describe('higherOf', () => {
    it('returns higher of two levels', () => {
      expect(higherOf('free', 'premium')).toBe('premium')
      expect(higherOf('enterprise', 'regular')).toBe('enterprise')
    })

    it('defaults to free for null/undefined', () => {
      expect(higherOf(null, null)).toBe('free')
      expect(higherOf(undefined, undefined)).toBe('free')
      expect(higherOf('premium', null)).toBe('premium')
    })
  })

  describe('getEffectiveAccessLevels', () => {
    it('free user gets only free', () => {
      expect(getEffectiveAccessLevels('free', null)).toEqual(['free'])
    })

    it('regular user gets free + regular', () => {
      expect(getEffectiveAccessLevels('regular', null)).toEqual(['free', 'regular'])
    })

    it('premium user gets free + regular + premium', () => {
      expect(getEffectiveAccessLevels('premium', null)).toEqual(['free', 'regular', 'premium'])
    })

    it('enterprise user gets all levels', () => {
      expect(getEffectiveAccessLevels('enterprise', null)).toEqual([
        'free', 'regular', 'premium', 'enterprise',
      ])
    })

    it('highest wins: user tier free + org enterprise = enterprise', () => {
      expect(getEffectiveAccessLevels('free', 'enterprise')).toEqual([
        'free', 'regular', 'premium', 'enterprise',
      ])
    })

    it('highest wins: user tier premium + org regular = premium', () => {
      expect(getEffectiveAccessLevels('premium', 'regular')).toEqual([
        'free', 'regular', 'premium',
      ])
    })
  })
})
