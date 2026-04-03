import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'
import { authenticated } from '../../access/authenticated'
import { setCompletedAt } from './hooks/setCompletedAt'
import { updateEnrollmentProgress } from '../../hooks/updateEnrollmentProgress'
import { updateStreak } from '../../hooks/updateStreak'

export const LessonProgress: CollectionConfig = {
  slug: 'lesson-progress',
  admin: {
    useAsTitle: 'lesson',
    defaultColumns: ['user', 'lesson', 'status', 'completedAt', 'lastAccessedAt'],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'lesson', type: 'relationship', relationTo: 'lessons', required: true },
    { name: 'enrollment', type: 'relationship', relationTo: 'enrollments', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'not_started',
      options: [
        { label: 'Not Started', value: 'not_started' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    { name: 'completedAt', type: 'date' },
    { name: 'videoWatchTime', type: 'number', defaultValue: 0, admin: { description: 'Seconds watched (populated by frontend)' } },
    { name: 'videoTotalDuration', type: 'number', defaultValue: 0, admin: { description: 'Total video length in seconds' } },
    { name: 'lastAccessedAt', type: 'date' },
  ],
  hooks: {
    beforeChange: [setCompletedAt],
    afterChange: [updateEnrollmentProgress, updateStreak],
  },
  access: {
    create: authenticated,
    read: canAccessOwnOrStaff,
    update: canAccessOwnOrStaff,
    delete: isAdmin,
  },
}
