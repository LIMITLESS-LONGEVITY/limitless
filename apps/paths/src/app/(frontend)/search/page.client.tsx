'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { useDebounce } from '@/utilities/useDebounce'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ContentListItem, type ContentListItemData } from '@/components/ContentListItem'
import { useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { apiUrl } from '@/utilities/apiUrl'

type SearchResult = {
  title: string
  slug: string
  collection: string
  accessLevel: string
  locked: boolean
  snippet: string
  relevanceScore: number
}

const PageClient: React.FC = () => {
  const { setHeaderTheme } = useHeaderTheme()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const res = await fetch(apiUrl('/api/ai/search'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), limit: 12 }),
      })

      if (!res.ok) {
        setResults([])
        return
      }

      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  // Update URL without navigation
  useEffect(() => {
    const url = debouncedQuery ? `/search?q=${encodeURIComponent(debouncedQuery)}` : '/search'
    window.history.replaceState(null, '', url)
  }, [debouncedQuery])

  /** Map a search result to ContentListItem props */
  const collectionLabel = (collection: string) => {
    const labels: Record<string, string> = { articles: 'Article', courses: 'Course', lessons: 'Lesson' }
    return labels[collection] || collection
  }

  const toListItem = (result: SearchResult): ContentListItemData => ({
    slug: result.slug || '',
    title: result.title,
    excerpt: result.snippet,
    accessLevel: result.accessLevel,
    pillarName: collectionLabel(result.collection),
  })

  /** Build the href for a search result */
  const toHref = (result: SearchResult): string => {
    // Articles link to /articles/[slug], lessons to /lessons/[slug], etc.
    const slug = result.slug || result.title.toLowerCase().replace(/\s+/g, '-')
    return `/${result.collection}/${slug}`
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container mb-16">
        <div className="max-w-none text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="font-display text-3xl font-light tracking-wide">Search</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-[10px] font-semibold uppercase tracking-wider border border-brand-teal/20">
              <Sparkles className="w-3 h-3" />
              AI-Powered
            </span>
          </div>
          <p className="text-brand-silver text-sm mb-8">Semantic search — understands what you mean, not just what you type.</p>

          <div className="max-w-[50rem] mx-auto">
            <form onSubmit={(e) => e.preventDefault()}>
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <Input
                id="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search with natural language... e.g. 'how to improve sleep quality'"
              />
              <button type="submit" className="sr-only">
                submit
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="container">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-lg border border-brand-glass-border animate-pulse">
                <div className="hidden sm:block w-[140px] h-[90px] rounded-lg bg-brand-glass-bg-hover flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 rounded bg-brand-glass-bg-hover w-24" />
                  <div className="h-3.5 rounded bg-brand-glass-bg-hover w-3/4" />
                  <div className="h-2.5 rounded bg-brand-glass-bg-hover w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-center text-brand-silver">No results found.</p>
        )}

        {results.length > 0 && (
          <div className="max-w-[50rem] mx-auto flex flex-col gap-2">
            {results.map((result, i) => (
              <ContentListItem
                key={`${result.collection}-${result.title}-${i}`}
                item={toListItem(result)}
                href={toHref(result)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageClient
