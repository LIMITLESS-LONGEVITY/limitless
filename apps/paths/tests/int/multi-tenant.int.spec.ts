import { describe, it, expect } from 'vitest'
import { canReadContent } from '@/access/canReadContent'
import { canEditContent } from '@/access/canEditContent'
import { canCreateContent } from '@/access/canCreateContent'
import { canAccessOwnOrStaff } from '@/access/canAccessOwnOrStaff'
import { canEditStructural } from '@/access/canEditStructural'

// Helper to build a minimal AccessArgs-like object
function mockAccess(user: Record<string, any> | null) {
  return { req: { user } } as any
}

describe('Multi-tenant access control', () => {
  const adminUser = { id: 'admin-1', role: 'admin' }
  const publisherUser = { id: 'pub-1', role: 'publisher' }
  const editorUser = { id: 'ed-1', role: 'editor' }
  const contributorUser = {
    id: 'contrib-1',
    role: 'contributor',
    tier: { accessLevel: 'regular' },
  }
  const freeUser = {
    id: 'user-1',
    role: 'user',
    tier: { accessLevel: 'free' },
  }
  const premiumUser = {
    id: 'user-2',
    role: 'user',
    tier: { accessLevel: 'premium' },
  }
  const enterpriseUser = {
    id: 'user-3',
    role: 'user',
    tier: { accessLevel: 'enterprise' },
  }
  const orgUser = {
    id: 'user-4',
    role: 'user',
    tier: { accessLevel: 'free' },
    tenant: { contentAccessLevel: 'premium' },
  }

  describe('canReadContent', () => {
    it('admin sees all content (returns true)', () => {
      expect(canReadContent(mockAccess(adminUser))).toBe(true)
    })

    it('publisher sees all content (returns true)', () => {
      expect(canReadContent(mockAccess(publisherUser))).toBe(true)
    })

    it('editor sees all content (returns true)', () => {
      expect(canReadContent(mockAccess(editorUser))).toBe(true)
    })

    it('contributor sees own content + published at their tier', () => {
      const result = canReadContent(mockAccess(contributorUser))
      expect(result).toHaveProperty('or')
      const orClause = (result as any).or
      expect(orClause).toHaveLength(2)
      // First clause: author = user.id
      expect(orClause[0]).toEqual({ author: { equals: 'contrib-1' } })
      // Second clause: published + access level filter
      expect(orClause[1].and).toEqual(
        expect.arrayContaining([
          { editorialStatus: { equals: 'published' } },
          { accessLevel: { in: ['free', 'regular'] } },
        ]),
      )
    })

    it('free user sees only published free content', () => {
      const result = canReadContent(mockAccess(freeUser))
      expect(result).toHaveProperty('and')
      const andClause = (result as any).and
      expect(andClause).toEqual(
        expect.arrayContaining([
          { editorialStatus: { equals: 'published' } },
          { accessLevel: { in: ['free'] } },
        ]),
      )
    })

    it('premium user sees published free + regular + premium content', () => {
      const result = canReadContent(mockAccess(premiumUser))
      const andClause = (result as any).and
      expect(andClause).toEqual(
        expect.arrayContaining([
          { editorialStatus: { equals: 'published' } },
          { accessLevel: { in: ['free', 'regular', 'premium'] } },
        ]),
      )
    })

    it('enterprise user sees all published content', () => {
      const result = canReadContent(mockAccess(enterpriseUser))
      const andClause = (result as any).and
      expect(andClause).toEqual(
        expect.arrayContaining([
          { editorialStatus: { equals: 'published' } },
          { accessLevel: { in: ['free', 'regular', 'premium', 'enterprise'] } },
        ]),
      )
    })

    it('org access level elevates free user to premium', () => {
      const result = canReadContent(mockAccess(orgUser))
      const andClause = (result as any).and
      expect(andClause).toEqual(
        expect.arrayContaining([
          { editorialStatus: { equals: 'published' } },
          { accessLevel: { in: ['free', 'regular', 'premium'] } },
        ]),
      )
    })

    it('anonymous user sees only published free content', () => {
      const result = canReadContent(mockAccess(null))
      const andClause = (result as any).and
      expect(andClause).toEqual(
        expect.arrayContaining([
          { editorialStatus: { equals: 'published' } },
          { accessLevel: { in: ['free'] } },
        ]),
      )
    })
  })

  describe('canEditContent', () => {
    it('admin can edit anything (returns true)', () => {
      expect(canEditContent(mockAccess(adminUser))).toBe(true)
    })

    it('publisher can edit anything (returns true)', () => {
      expect(canEditContent(mockAccess(publisherUser))).toBe(true)
    })

    it('editor can edit anything (returns true)', () => {
      expect(canEditContent(mockAccess(editorUser))).toBe(true)
    })

    it('contributor can only edit own drafts', () => {
      const result = canEditContent(mockAccess(contributorUser))
      expect(result).toHaveProperty('and')
      const andClause = (result as any).and
      expect(andClause).toEqual(
        expect.arrayContaining([
          { author: { equals: 'contrib-1' } },
          { editorialStatus: { equals: 'draft' } },
        ]),
      )
    })

    it('regular user cannot edit content (returns false)', () => {
      expect(canEditContent(mockAccess(freeUser))).toBe(false)
    })

    it('anonymous user cannot edit content (returns false)', () => {
      expect(canEditContent(mockAccess(null))).toBe(false)
    })
  })

  describe('canCreateContent', () => {
    it('admin can create content', () => {
      expect(canCreateContent(mockAccess(adminUser))).toBe(true)
    })

    it('publisher can create content', () => {
      expect(canCreateContent(mockAccess(publisherUser))).toBe(true)
    })

    it('editor can create content', () => {
      expect(canCreateContent(mockAccess(editorUser))).toBe(true)
    })

    it('contributor can create content', () => {
      expect(canCreateContent(mockAccess(contributorUser))).toBe(true)
    })

    it('regular user cannot create content', () => {
      expect(canCreateContent(mockAccess(freeUser))).toBe(false)
    })

    it('anonymous user cannot create content', () => {
      expect(canCreateContent(mockAccess(null))).toBe(false)
    })
  })

  describe('canAccessOwnOrStaff', () => {
    it('admin accesses all records (returns true)', () => {
      expect(canAccessOwnOrStaff(mockAccess(adminUser))).toBe(true)
    })

    it('publisher accesses all records (returns true)', () => {
      expect(canAccessOwnOrStaff(mockAccess(publisherUser))).toBe(true)
    })

    it('editor accesses all records (returns true)', () => {
      expect(canAccessOwnOrStaff(mockAccess(editorUser))).toBe(true)
    })

    it('contributor accesses all records (returns true)', () => {
      expect(canAccessOwnOrStaff(mockAccess(contributorUser))).toBe(true)
    })

    it('regular user sees only own records', () => {
      const result = canAccessOwnOrStaff(mockAccess(freeUser))
      expect(result).toEqual({ user: { equals: 'user-1' } })
    })

    it('anonymous user has no access (returns false)', () => {
      expect(canAccessOwnOrStaff(mockAccess(null))).toBe(false)
    })
  })

  describe('canEditStructural', () => {
    it('admin can edit structural content', () => {
      expect(canEditStructural(mockAccess(adminUser))).toBe(true)
    })

    it('publisher can edit structural content', () => {
      expect(canEditStructural(mockAccess(publisherUser))).toBe(true)
    })

    it('editor can edit structural content', () => {
      expect(canEditStructural(mockAccess(editorUser))).toBe(true)
    })

    it('contributor cannot edit structural content', () => {
      expect(canEditStructural(mockAccess(contributorUser))).toBe(false)
    })

    it('regular user cannot edit structural content', () => {
      expect(canEditStructural(mockAccess(freeUser))).toBe(false)
    })

    it('anonymous user cannot edit structural content', () => {
      expect(canEditStructural(mockAccess(null))).toBe(false)
    })
  })
})
