'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

const BRAND_COLORS = ['#C9A84C', '#4ECDC4', '#D4AF37', '#2A9D8F']

export function fireCourseCompleteConfetti() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: BRAND_COLORS,
    shapes: ['circle'],
    gravity: 1.2,
    ticks: 150,
  })
}

export const CelebrationConfetti: React.FC<{ fire: boolean }> = ({ fire }) => {
  useEffect(() => {
    if (fire) fireCourseCompleteConfetti()
  }, [fire])

  return null
}
