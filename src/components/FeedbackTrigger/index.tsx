'use client'

import React, { useState } from 'react'
import { FeedbackModal } from '@/components/FeedbackModal'

export function FeedbackTrigger() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-brand-silver/40 hover:text-brand-gold text-[10px] transition-colors"
      >
        Share Feedback
      </button>
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
