import { describe, it, expect } from 'vitest'
import {
  isValidTransition,
  getRequiredRole,
  hasRole,
} from '@/hooks/editorialWorkflow'

describe('Editorial workflow state machine', () => {
  describe('valid transitions', () => {
    it('draft → in_review requires contributor', () => {
      expect(isValidTransition('draft', 'in_review')).toBe(true)
      expect(getRequiredRole('draft', 'in_review')).toBe('contributor')
    })

    it('in_review → approved requires editor', () => {
      expect(isValidTransition('in_review', 'approved')).toBe(true)
      expect(getRequiredRole('in_review', 'approved')).toBe('editor')
    })

    it('in_review → draft (rejection) requires editor', () => {
      expect(isValidTransition('in_review', 'draft')).toBe(true)
      expect(getRequiredRole('in_review', 'draft')).toBe('editor')
    })

    it('approved → published requires publisher', () => {
      expect(isValidTransition('approved', 'published')).toBe(true)
      expect(getRequiredRole('approved', 'published')).toBe('publisher')
    })

    it('published → archived requires publisher', () => {
      expect(isValidTransition('published', 'archived')).toBe(true)
      expect(getRequiredRole('published', 'archived')).toBe('publisher')
    })

    it('published → draft (unpublish) requires publisher', () => {
      expect(isValidTransition('published', 'draft')).toBe(true)
      expect(getRequiredRole('published', 'draft')).toBe('publisher')
    })

    it('archived → draft requires admin', () => {
      expect(isValidTransition('archived', 'draft')).toBe(true)
      expect(getRequiredRole('archived', 'draft')).toBe('admin')
    })
  })

  describe('invalid transitions', () => {
    it('draft → published is not allowed', () => {
      expect(isValidTransition('draft', 'published')).toBe(false)
    })

    it('draft → approved is not allowed', () => {
      expect(isValidTransition('draft', 'approved')).toBe(false)
    })

    it('in_review → published is not allowed', () => {
      expect(isValidTransition('in_review', 'published')).toBe(false)
    })

    it('archived → published is not allowed', () => {
      expect(isValidTransition('archived', 'published')).toBe(false)
    })
  })

  describe('role hierarchy', () => {
    it('admin has all roles', () => {
      expect(hasRole('admin', 'contributor')).toBe(true)
      expect(hasRole('admin', 'editor')).toBe(true)
      expect(hasRole('admin', 'publisher')).toBe(true)
      expect(hasRole('admin', 'admin')).toBe(true)
    })

    it('publisher has contributor and editor', () => {
      expect(hasRole('publisher', 'contributor')).toBe(true)
      expect(hasRole('publisher', 'editor')).toBe(true)
      expect(hasRole('publisher', 'publisher')).toBe(true)
      expect(hasRole('publisher', 'admin')).toBe(false)
    })

    it('editor has contributor', () => {
      expect(hasRole('editor', 'contributor')).toBe(true)
      expect(hasRole('editor', 'editor')).toBe(true)
      expect(hasRole('editor', 'publisher')).toBe(false)
    })

    it('contributor is lowest editorial role', () => {
      expect(hasRole('contributor', 'contributor')).toBe(true)
      expect(hasRole('contributor', 'editor')).toBe(false)
    })

    it('user has no editorial roles', () => {
      expect(hasRole('user', 'contributor')).toBe(false)
    })
  })

  describe('same-status transitions', () => {
    it('same status is always valid (no transition)', () => {
      expect(isValidTransition('draft', 'draft')).toBe(true)
      expect(isValidTransition('published', 'published')).toBe(true)
    })
  })
})
