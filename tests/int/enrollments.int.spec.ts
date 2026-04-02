import { describe, it, expect } from 'vitest'
import {
  preventDuplicateEnrollment,
} from '@/collections/Enrollments/hooks/preventDuplicateEnrollment'
import {
  restrictUserUpdates,
  ALLOWED_USER_STATUS_TRANSITIONS,
} from '@/collections/Enrollments/hooks/restrictUserUpdates'

describe('Enrollment hooks', () => {
  describe('preventDuplicateEnrollment', () => {
    it('exports a beforeChange hook function', () => {
      expect(typeof preventDuplicateEnrollment).toBe('function')
    })
  })

  describe('restrictUserUpdates', () => {
    it('exports ALLOWED_USER_STATUS_TRANSITIONS', () => {
      expect(ALLOWED_USER_STATUS_TRANSITIONS).toContain('cancelled')
    })

    it('exports a beforeChange hook function', () => {
      expect(typeof restrictUserUpdates).toBe('function')
    })
  })
})
