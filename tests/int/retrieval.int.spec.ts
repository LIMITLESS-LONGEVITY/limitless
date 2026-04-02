import { describe, it, expect } from 'vitest'
import { buildAccessFilter } from '@/ai/retrieval'

describe('Retrieval pipeline', () => {
  describe('buildAccessFilter', () => {
    it('returns free only for anonymous users', () => {
      const filter = buildAccessFilter(null, [])
      expect(filter).toEqual(['free'])
    })

    it('returns effective levels for authenticated user', () => {
      const user = { tier: { accessLevel: 'premium' } } as any
      const filter = buildAccessFilter(user, [])
      expect(filter).toEqual(['free', 'regular', 'premium'])
    })

    it('includes enrolled course access levels', () => {
      const user = { tier: { accessLevel: 'free' } } as any
      const enrolledCourseLevels = ['premium']
      const filter = buildAccessFilter(user, enrolledCourseLevels)
      expect(filter).toContain('premium')
      expect(filter).toContain('free')
    })

    it('returns all levels for admin', () => {
      const user = { role: 'admin' } as any
      const filter = buildAccessFilter(user, [])
      expect(filter).toEqual(['free', 'regular', 'premium', 'enterprise'])
    })
  })
})
