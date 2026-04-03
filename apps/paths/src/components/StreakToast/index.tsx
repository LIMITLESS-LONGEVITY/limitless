'use client'

import { motion, AnimatePresence } from 'framer-motion'

const MILESTONES = [7, 30, 100] as const

function getMilestoneMessage(streak: number): string | null {
  if (streak === 7) return '7-day streak!'
  if (streak === 30) return '30-day streak!'
  if (streak === 100) return '100-day streak!'
  return null
}

export function isMilestone(streak: number): boolean {
  return MILESTONES.includes(streak as (typeof MILESTONES)[number])
}

export const StreakToast: React.FC<{ streak: number | null }> = ({ streak }) => {
  const message = streak ? getMilestoneMessage(streak) : null

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const show = !!message && !prefersReduced

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-brand-dark/90 border border-brand-gold/40 backdrop-blur-md shadow-lg"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <p className="text-sm font-medium text-brand-gold tracking-wide">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
