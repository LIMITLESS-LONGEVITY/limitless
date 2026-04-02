'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import { GlassCard } from '@/components/homepage/GlassCard'
import { TierBadge } from '@/components/TierBadge'
import { Sparkles, ArrowRight } from 'lucide-react'
import { apiUrl } from '@/utilities/apiUrl'

const SUGGESTED_PROMPTS = [
  'Optimize my sleep quality',
  'Reduce inflammation naturally',
  'Improve cardiovascular health',
  'Balance my hormones',
  'Build a longevity routine',
  'Boost cognitive performance',
]

type PathItem = {
  sourceId: string
  collection: string
  title: string
  reasoning: string
  order: number
  accessLevel: string
  locked?: boolean
  slug?: string
}

export default function DiscoverClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState<PathItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDiscover = async (q?: string) => {
    const searchQuery = q || query
    if (!searchQuery.trim() || searchQuery.length < 3) return

    setLoading(true)
    setError(null)
    setPath(null)

    try {
      const res = await fetch(apiUrl('/api/ai/discover'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 6 }),
      })

      if (res.status === 401) {
        setError('Please sign in to use AI-powered content discovery.')
        return
      }

      if (res.status === 429) {
        setError('Daily discovery limit reached. Upgrade your plan for more access.')
        return
      }

      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }

      const data = await res.json()
      setPath(data.path || [])
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestion = (prompt: string) => {
    setQuery(prompt)
    handleDiscover(prompt)
  }

  const getContentHref = (item: PathItem) => {
    const id = item.slug || item.sourceId
    if (item.collection === 'articles') return `/articles/${id}`
    if (item.collection === 'courses') return `/courses/${id}`
    if (item.collection === 'lessons') return '#'
    return '#'
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-24 pb-16">
        <GlassCard hover={false} className="max-w-md text-center">
          <Sparkles className="w-8 h-8 text-brand-gold mx-auto mb-4" />
          <h1 className="font-display text-2xl font-light tracking-wide text-brand-light mb-3">
            AI-Powered Discovery
          </h1>
          <p className="text-brand-silver text-sm mb-6">
            Sign in to get personalized learning paths based on your health goals.
          </p>
          <Link
            href="/login?redirect=/discover"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300"
          >
            Sign In
          </Link>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark px-4 pt-24 pb-16">
      <div className="container max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold-dim text-brand-gold text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-light tracking-wide text-brand-light mb-3">
            What would you like to improve?
          </h1>
          <p className="text-brand-silver text-sm">
            Describe your health goals and we&apos;ll build a personalized learning path.
          </p>
        </div>

        {/* Input */}
        <div className="mb-8">
          <form
            onSubmit={(e) => { e.preventDefault(); handleDiscover() }}
            className="flex gap-3"
          >
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., I want to optimize my sleep quality and reduce inflammation..."
              rows={2}
              className="flex-1 px-4 py-3 bg-brand-glass-bg border border-brand-glass-border rounded-xl text-sm text-brand-light placeholder:text-brand-silver/50 outline-none focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/30 transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={loading || query.length < 3}
              className={cn(
                'px-6 py-3 rounded-xl text-sm font-medium transition-all self-end',
                'border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark',
                (loading || query.length < 3) && 'opacity-50 cursor-not-allowed',
              )}
            >
              {loading ? 'Building...' : 'Discover'}
            </button>
          </form>
        </div>

        {/* Suggested Prompts */}
        {!path && !loading && (
          <div className="mb-12">
            <p className="text-xs text-brand-silver uppercase tracking-wider mb-3">Try a suggestion</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestion(prompt)}
                  className="px-3 py-2.5 rounded-lg text-xs text-left text-brand-silver bg-brand-glass-bg border border-brand-glass-border hover:bg-brand-glass-bg-hover hover:text-brand-light transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-brand-gold text-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Building your learning path...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {path && path.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver">
              Your Learning Path ({path.length} steps)
            </h2>
            {path.map((item) => (
              <Link key={`${item.collection}-${item.sourceId}`} href={getContentHref(item)} className="block">
                <GlassCard className="flex items-start gap-4 !p-4">
                  <div className="w-8 h-8 rounded-full bg-brand-gold-dim flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-display text-brand-gold">{item.order}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-brand-teal uppercase tracking-wider font-medium">
                        {item.collection}
                      </span>
                      <TierBadge tier={item.accessLevel} />
                    </div>
                    <h3 className="text-sm font-semibold mb-1 group-hover:text-brand-gold transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-brand-silver">{item.reasoning}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-silver flex-shrink-0 mt-1" />
                </GlassCard>
              </Link>
            ))}
            <div className="text-center pt-4">
              <button
                onClick={() => { setPath(null); setQuery('') }}
                className="text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
              >
                Try another query
              </button>
            </div>
          </div>
        )}

        {/* Empty results */}
        {path && path.length === 0 && (
          <div className="text-center py-12">
            <p className="text-brand-silver text-sm mb-2">No matching content found for your goal.</p>
            <p className="text-brand-silver/60 text-xs">Try a different description or browse our content directly.</p>
          </div>
        )}
      </div>
    </div>
  )
}
