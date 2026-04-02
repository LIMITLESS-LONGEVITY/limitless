'use client'

import type { SelectFieldClientComponent } from 'payload'
import { SelectField, useAuth } from '@payloadcms/ui'
import React, { useMemo } from 'react'

import type { EditorialRole } from '../../../hooks/editorialWorkflow'

/**
 * All editorial status options — must match the field config in Articles/Courses.
 */
const ALL_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
]

/**
 * Statuses each role is allowed to set (transition TO).
 * This is a simplified view of the state machine for UX filtering.
 * The backend hook still enforces actual transition validity.
 */
const ROLE_ALLOWED_STATUSES: Record<string, string[]> = {
  user: [],
  contributor: ['draft', 'in_review'],
  editor: ['draft', 'in_review', 'approved'],
  publisher: ['draft', 'in_review', 'approved', 'published', 'archived'],
  admin: ['draft', 'in_review', 'approved', 'published', 'archived'],
}

/**
 * Custom admin select field for editorialStatus that filters the
 * dropdown options based on the current user's role.
 *
 * This is a cosmetic UX improvement — the backend `validateEditorialTransition`
 * hook is the authoritative enforcement layer.
 */
export const EditorialStatusField: SelectFieldClientComponent = (props) => {
  const { field, path: _path, value } = props
  const { user } = useAuth()

  const userRole = (user as { role?: string } | null)?.role as EditorialRole | undefined

  const filteredField = useMemo(() => {
    const allowedStatuses = userRole ? (ROLE_ALLOWED_STATUSES[userRole] || []) : []

    // Always include the current value so the user can see the current status,
    // even if they can't transition away from it.
    const filteredOptions = ALL_OPTIONS.filter(
      (opt) => allowedStatuses.includes(opt.value) || opt.value === value,
    )

    return {
      ...field,
      options: filteredOptions.length > 0 ? filteredOptions : ALL_OPTIONS,
    }
  }, [field, userRole, value])

  return <SelectField {...props} field={filteredField} />
}

export default EditorialStatusField
