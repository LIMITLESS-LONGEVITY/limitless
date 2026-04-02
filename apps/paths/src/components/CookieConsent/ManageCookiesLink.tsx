'use client'

import React from 'react'
import { openCookieConsent } from './index'

export function ManageCookiesLink() {
  return (
    <button
      onClick={openCookieConsent}
      className="text-brand-silver/40 hover:text-brand-gold text-[10px] transition-colors cursor-pointer bg-transparent border-none p-0 min-h-[44px] flex items-center"
    >
      Manage Cookies
    </button>
  )
}
