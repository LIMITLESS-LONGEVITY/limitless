import React from 'react'
import { Media } from '@/components/Media'
import { Linkedin } from 'lucide-react'

type ExpertCardProps = {
  firstName?: string | null
  lastName?: string | null
  avatar?: any
  bio?: string | null
  expertise?: Array<{ area: string }> | null
  credentials?: Array<{ title: string; institution?: string | null; year?: number | null }> | null
  linkedIn?: string | null
  publicProfile?: boolean | null
  variant?: 'inline' | 'card'
}

export const ExpertCard: React.FC<ExpertCardProps> = ({
  firstName,
  lastName,
  avatar,
  bio,
  expertise,
  credentials,
  linkedIn,
  variant = 'inline',
}) => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  if (!fullName) return null

  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('')
  const primaryCredential = credentials?.[0]

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {avatar && typeof avatar === 'object' ? (
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-brand-gold/30 flex-shrink-0">
            <Media resource={avatar} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-gold-dim ring-2 ring-brand-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-gold text-sm font-display font-semibold">{initials}</span>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{fullName}</span>
            {linkedIn && (
              <a
                href={linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-silver hover:text-brand-gold transition-colors"
                aria-label={`${fullName} on LinkedIn`}
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {primaryCredential && (
            <p className="text-xs text-brand-silver truncate">
              {primaryCredential.title}
              {primaryCredential.institution && `, ${primaryCredential.institution}`}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Card variant — for sidebars or featured display
  return (
    <div className="p-4 rounded-xl border border-brand-glass-border bg-brand-glass-bg">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {avatar && typeof avatar === 'object' ? (
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-brand-gold/30 flex-shrink-0">
            <Media resource={avatar} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-gold-dim ring-2 ring-brand-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-gold text-lg font-display font-semibold">{initials}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-display font-normal tracking-wide">{fullName}</h3>
            {linkedIn && (
              <a
                href={linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-silver hover:text-brand-gold transition-colors"
                aria-label={`${fullName} on LinkedIn`}
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>

          {primaryCredential && (
            <p className="text-xs text-brand-gold mt-0.5">
              {primaryCredential.title}
              {primaryCredential.institution && ` — ${primaryCredential.institution}`}
            </p>
          )}

          {/* Expertise tags */}
          {expertise && expertise.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {expertise.slice(0, 3).map((exp, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-brand-teal-dim text-brand-teal font-medium"
                >
                  {exp.area}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <p className="text-xs text-brand-silver mt-3 line-clamp-2 leading-relaxed">{bio}</p>
      )}
    </div>
  )
}
