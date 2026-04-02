import { describe, it, expect } from 'vitest'
import { canReadContent } from '@/access/canReadContent'
import { canEditContent } from '@/access/canEditContent'
import { canCreateContent } from '@/access/canCreateContent'
import { canAccessOwnOrStaff } from '@/access/canAccessOwnOrStaff'
import { canEditStructural } from '@/access/canEditStructural'
import { isAdmin, isAdminOrSelf } from '@/access/isAdmin'
import { authenticated } from '@/access/authenticated'

// Helper to build a minimal AccessArgs-like object
function mockAccess(user: Record<string, any> | null) {
  return { req: { user } } as any
}

const ROLES = ['user', 'contributor', 'editor', 'publisher', 'admin'] as const

function makeUser(role: string, id = `${role}-1`) {
  return {
    id,
    role,
    tier: { accessLevel: 'free' },
  }
}

describe('Access matrix: every role x every access function', () => {
  // Expected results per role per access function
  // true = full access, false = no access, 'query' = returns a Where query object
  const expectations: Record<
    string,
    Record<string, 'true' | 'false' | 'query'>
  > = {
    canReadContent: {
      user: 'query',
      contributor: 'query',
      editor: 'true',
      publisher: 'true',
      admin: 'true',
    },
    canEditContent: {
      user: 'false',
      contributor: 'query',
      editor: 'true',
      publisher: 'true',
      admin: 'true',
    },
    canCreateContent: {
      user: 'false',
      contributor: 'true',
      editor: 'true',
      publisher: 'true',
      admin: 'true',
    },
    canAccessOwnOrStaff: {
      user: 'query',
      contributor: 'true',
      editor: 'true',
      publisher: 'true',
      admin: 'true',
    },
    canEditStructural: {
      user: 'false',
      contributor: 'false',
      editor: 'true',
      publisher: 'true',
      admin: 'true',
    },
    isAdmin: {
      user: 'false',
      contributor: 'false',
      editor: 'false',
      publisher: 'false',
      admin: 'true',
    },
    isAdminOrSelf: {
      user: 'query',
      contributor: 'query',
      editor: 'query',
      publisher: 'query',
      admin: 'true',
    },
    authenticated: {
      user: 'true',
      contributor: 'true',
      editor: 'true',
      publisher: 'true',
      admin: 'true',
    },
  }

  const accessFunctions: Record<string, (args: any) => any> = {
    canReadContent,
    canEditContent,
    canCreateContent,
    canAccessOwnOrStaff,
    canEditStructural,
    isAdmin,
    isAdminOrSelf,
    authenticated,
  }

  for (const [fnName, fn] of Object.entries(accessFunctions)) {
    describe(fnName, () => {
      for (const role of ROLES) {
        it(`${role} → ${expectations[fnName][role]}`, () => {
          const user = makeUser(role)
          const result = fn(mockAccess(user))
          const expected = expectations[fnName][role]

          if (expected === 'true') {
            expect(result).toBe(true)
          } else if (expected === 'false') {
            expect(result).toBe(false)
          } else {
            // 'query' — should return an object (Where clause), not a boolean
            expect(typeof result).toBe('object')
            expect(result).not.toBeNull()
          }
        })
      }

      // Anonymous (null user) tests
      it('anonymous → appropriate denial', () => {
        const result = fn(mockAccess(null))
        if (fnName === 'canReadContent') {
          // Returns a query (published free content)
          expect(typeof result).toBe('object')
          expect(result).not.toBeNull()
        } else if (fnName === 'authenticatedOrPublished') {
          expect(typeof result).toBe('object')
        } else {
          // All other functions deny anonymous users
          expect(result).toBe(false)
        }
      })
    })
  }

  describe('isAdminOrSelf query shape', () => {
    it('non-admin returns id-based WHERE clause', () => {
      const result = isAdminOrSelf(mockAccess(makeUser('editor', 'ed-99')))
      expect(result).toEqual({ id: { equals: 'ed-99' } })
    })
  })

  describe('canEditContent query shape for contributor', () => {
    it('returns author + draft constraint', () => {
      const result = canEditContent(mockAccess(makeUser('contributor', 'c-42')))
      expect(result).toHaveProperty('and')
      const andClause = (result as any).and
      expect(andClause).toEqual(
        expect.arrayContaining([
          { author: { equals: 'c-42' } },
          { editorialStatus: { equals: 'draft' } },
        ]),
      )
    })
  })

  describe('canReadContent query shape for contributor', () => {
    it('returns OR of own-content and published-at-tier', () => {
      const result = canReadContent(mockAccess(makeUser('contributor', 'c-42')))
      expect(result).toHaveProperty('or')
      const orClause = (result as any).or
      expect(orClause[0]).toEqual({ author: { equals: 'c-42' } })
      expect(orClause[1]).toHaveProperty('and')
    })
  })

  describe('canAccessOwnOrStaff query shape for user', () => {
    it('returns user-based WHERE clause', () => {
      const result = canAccessOwnOrStaff(mockAccess(makeUser('user', 'u-77')))
      expect(result).toEqual({ user: { equals: 'u-77' } })
    })
  })
})
