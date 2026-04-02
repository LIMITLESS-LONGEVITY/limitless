'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'
import { Search, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

type SearchEntry = {
  role: string
  topic: string
  title: string
  description: string
  body: string
  headings: string[]
  url: string
}

const roleLabels: Record<string, string> = {
  'user-free': 'Free User',
  'user-paid': 'Paid User',
  'user-organization': 'Org User',
  contributor: 'Contributor',
  editor: 'Editor',
  publisher: 'Publisher',
  admin: 'Admin',
}

export const GuideSearch: React.FC<{
  className?: string
}> = ({ className }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchEntry[]>([])
  const [index, setIndex] = useState<SearchEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()

  // Load search index on mount
  useEffect(() => {
    fetch('/guide/search-index.json')
      .then((res) => res.json())
      .then((data: SearchEntry[]) => setIndex(data))
      .catch(() => {})
  }, [])

  // Close on navigation
  useEffect(() => {
    queueMicrotask(() => {
      setIsOpen(false)
      setQuery('')
    })
  }, [pathname])

  // Search
  const search = useCallback(
    (q: string) => {
      if (!q.trim() || index.length === 0) {
        setResults([])
        return
      }

      const terms = q.toLowerCase().split(/\s+/)
      const scored = index
        .map((entry) => {
          const searchable = [
            entry.title,
            entry.description,
            entry.body,
            ...entry.headings,
          ]
            .join(' ')
            .toLowerCase()

          let score = 0
          for (const term of terms) {
            if (entry.title.toLowerCase().includes(term)) score += 10
            if (entry.description.toLowerCase().includes(term)) score += 5
            if (entry.headings.some((h) => h.toLowerCase().includes(term))) score += 3
            if (searchable.includes(term)) score += 1
          }
          return { entry, score }
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((s) => s.entry)

      setResults(scored)
    },
    [index],
  )

  useEffect(() => {
    queueMicrotask(() => search(query))
  }, [query, search])

  return (
    <div className={cn('relative', className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search guide..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (query) setIsOpen(true)
          }}
          className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-1">
              {results.map((result) => (
                <Link
                  key={result.url}
                  href={result.url}
                  className="block px-3 py-2 hover:bg-muted/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                      {roleLabels[result.role] || result.role}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {result.title}
                    </span>
                  </div>
                  {result.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate pl-0">
                      {result.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
