'use client'
import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { apiUrl } from '@/utilities/apiUrl'

type RelatedItem = {
  id: string
  title: string
  collection: string
  similarityScore: number
}

export const RelatedContentPanel: React.FC = () => {
  const { id, collectionSlug } = useDocumentInfo()
  const [related, setRelated] = useState<RelatedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const findRelated = async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      // Fetch current document content
      const docRes = await fetch(apiUrl(`/api/${collectionSlug}/${id}?depth=0`), { credentials: 'include' })
      const doc = await docRes.json()

      // Extract text from content field
      const content = doc.content || doc.description
      if (!content) {
        setError('No content to analyze')
        setLoading(false)
        return
      }

      // Call related content endpoint
      const res = await fetch(apiUrl('/api/ai/related-content'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: typeof content === 'string' ? content : JSON.stringify(content),
          excludeId: id,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setRelated(data.related || [])
    } catch {
      setError('Failed to find related content')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '16px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>
        Related Content
      </h4>
      <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>
        Find semantically similar articles and lessons.
      </p>
      <button
        onClick={findRelated}
        disabled={loading || !id}
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          marginBottom: '12px',
        }}
      >
        {loading ? 'Searching...' : 'Find Related'}
      </button>

      {error && (
        <p style={{ fontSize: '12px', color: '#e55' }}>{error}</p>
      )}

      {related.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {related.map((item) => (
            <li key={item.id} style={{ marginBottom: '8px' }}>
              <a
                href={`/admin/collections/${item.collection}/${item.id}`}
                style={{ fontSize: '12px', color: '#4a9eff', textDecoration: 'none' }}
              >
                {item.title}
              </a>
              <span style={{ fontSize: '10px', color: '#888', marginLeft: '6px' }}>
                {item.collection} · {Math.round(item.similarityScore * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
