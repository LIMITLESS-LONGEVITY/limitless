import { describe, it, expect } from 'vitest'
import { shouldBypassForEnrollment } from '@/hooks/computeLockedStatus'

describe('Course reference bypass', () => {
  it('returns false when article has no relatedCourses', () => {
    expect(shouldBypassForEnrollment([], ['course-1'])).toBe(false)
  })

  it('returns false when relatedCourses is undefined', () => {
    expect(shouldBypassForEnrollment(undefined, ['course-1'])).toBe(false)
  })

  it('returns true when user is enrolled in a related course', () => {
    expect(shouldBypassForEnrollment(['course-1', 'course-2'], ['course-1'])).toBe(true)
  })

  it('returns false when user is not enrolled in any related course', () => {
    expect(shouldBypassForEnrollment(['course-1', 'course-2'], ['course-3'])).toBe(false)
  })

  it('handles mixed string and object IDs', () => {
    const relatedCourses = [{ id: 'course-1' }, 'course-2']
    expect(shouldBypassForEnrollment(relatedCourses, ['course-2'])).toBe(true)
  })
})
