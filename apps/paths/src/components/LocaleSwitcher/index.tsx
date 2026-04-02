'use client'

import React, { useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espanol' },
  { code: 'ru', label: 'Pyccкий' },
] as const

export const LocaleSwitcher: React.FC = () => {
  const currentLocale = useLocale()
  const t = useTranslations('locale')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;SameSite=Lax`
    window.location.reload()
  }, [])

  return (
    <label className="relative inline-flex items-center gap-1.5">
      <span className="sr-only">{t('switchLocale')}</span>
      <select
        value={currentLocale}
        onChange={handleChange}
        className="appearance-none bg-transparent text-brand-silver text-[10px] uppercase tracking-[0.1em] font-sans font-medium cursor-pointer border border-brand-glass-border rounded-md px-2 py-1 pr-5 hover:border-brand-gold/30 focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none transition-colors [&>option]:bg-brand-dark [&>option]:text-brand-silver"
        aria-label={t('switchLocale')}
      >
        {LOCALES.map((locale) => (
          <option
            key={locale.code}
            value={locale.code}
            className={currentLocale === locale.code ? 'text-brand-gold' : ''}
          >
            {locale.code.toUpperCase()}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-silver/60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  )
}
