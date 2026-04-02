import { describe, it, expect } from 'vitest'
import { chunkLexicalContent } from '@/ai/chunker'
import { buildAccessFilter } from '@/ai/retrieval'

describe('RAG indexing', () => {
  describe('chunker edge cases', () => {
    it('handles empty root children', () => {
      const lexical = { root: { children: [] } }
      const chunks = chunkLexicalContent(lexical)
      expect(chunks).toEqual([])
    })

    it('handles deeply nested text nodes', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Outer ',
                },
                {
                  type: 'link',
                  children: [{ type: 'text', text: 'linked text' }],
                },
                {
                  type: 'text',
                  text: ' after link.',
                },
              ],
            },
          ],
        },
      }

      const chunks = chunkLexicalContent(lexical)
      expect(chunks).toHaveLength(1)
      expect(chunks[0].text).toContain('Outer')
      expect(chunks[0].text).toContain('linked text')
      expect(chunks[0].text).toContain('after link.')
    })

    it('handles mixed heading levels (H2 splits, H3 does not)', () => {
      const lexical = {
        root: {
          children: [
            { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Section A' }] },
            { type: 'paragraph', children: [{ type: 'text', text: 'A content.' }] },
            { type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Subsection A.1' }] },
            { type: 'paragraph', children: [{ type: 'text', text: 'A.1 content.' }] },
            { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Section B' }] },
            { type: 'paragraph', children: [{ type: 'text', text: 'B content.' }] },
          ],
        },
      }

      const chunks = chunkLexicalContent(lexical)
      expect(chunks).toHaveLength(2)
      // H3 content stays in Section A's chunk
      expect(chunks[0].text).toContain('Section A')
      expect(chunks[0].text).toContain('A.1 content.')
      expect(chunks[1].text).toContain('Section B')
    })

    it('handles content before first heading as a separate chunk', () => {
      const lexical = {
        root: {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'Preamble text.' }] },
            { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'First Section' }] },
            { type: 'paragraph', children: [{ type: 'text', text: 'Section content.' }] },
          ],
        },
      }

      const chunks = chunkLexicalContent(lexical)
      expect(chunks).toHaveLength(2)
      expect(chunks[0].text).toContain('Preamble text.')
      expect(chunks[1].text).toContain('First Section')
    })

    it('handles single heading with no body text', () => {
      const lexical = {
        root: {
          children: [
            { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Lonely Heading' }] },
          ],
        },
      }

      const chunks = chunkLexicalContent(lexical)
      expect(chunks).toHaveLength(1)
      expect(chunks[0].text).toContain('Lonely Heading')
    })

    it('handles paragraph with no children', () => {
      const lexical = {
        root: {
          children: [
            { type: 'paragraph', children: [] },
          ],
        },
      }

      const chunks = chunkLexicalContent(lexical)
      // Should produce a chunk (possibly empty text) without throwing
      expect(chunks.length).toBeLessThanOrEqual(1)
    })

    it('produces correct token estimates for longer content', () => {
      const words = Array(200).fill('longevity').join(' ')
      const lexical = {
        root: {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: words }] },
          ],
        },
      }

      const chunks = chunkLexicalContent(lexical)
      expect(chunks).toHaveLength(1)
      // ~200 words should be roughly 200-300 tokens (word-based estimate)
      expect(chunks[0].tokenCount).toBeGreaterThan(50)
    })
  })

  describe('buildAccessFilter edge cases', () => {
    it('anonymous user gets free only', () => {
      expect(buildAccessFilter(null, [])).toEqual(['free'])
    })

    it('user with no tier defaults to free', () => {
      const user = { role: 'user' } as any
      expect(buildAccessFilter(user, [])).toEqual(['free'])
    })

    it('regular user gets free + regular', () => {
      const user = { tier: { accessLevel: 'regular' } } as any
      expect(buildAccessFilter(user, [])).toEqual(['free', 'regular'])
    })

    it('premium user gets free + regular + premium', () => {
      const user = { tier: { accessLevel: 'premium' } } as any
      expect(buildAccessFilter(user, [])).toEqual(['free', 'regular', 'premium'])
    })

    it('enterprise user gets all levels', () => {
      const user = { tier: { accessLevel: 'enterprise' } } as any
      expect(buildAccessFilter(user, [])).toEqual(['free', 'regular', 'premium', 'enterprise'])
    })

    it('admin gets all levels regardless of tier', () => {
      const user = { role: 'admin' } as any
      expect(buildAccessFilter(user, [])).toEqual(['free', 'regular', 'premium', 'enterprise'])
    })

    it('enrolled course levels merge with user tier', () => {
      const user = { tier: { accessLevel: 'free' } } as any
      const filter = buildAccessFilter(user, ['premium', 'enterprise'])
      expect(filter).toContain('free')
      expect(filter).toContain('premium')
      expect(filter).toContain('enterprise')
    })

    it('duplicate levels are deduplicated', () => {
      const user = { tier: { accessLevel: 'premium' } } as any
      const filter = buildAccessFilter(user, ['premium', 'free'])
      const uniqueLevels = new Set(filter)
      expect(uniqueLevels.size).toBe(filter.length)
    })

    it('editor gets all levels (staff bypass)', () => {
      const user = { role: 'editor' } as any
      const filter = buildAccessFilter(user, [])
      expect(filter).toEqual(['free', 'regular', 'premium', 'enterprise'])
    })

    it('publisher gets all levels (staff bypass)', () => {
      const user = { role: 'publisher' } as any
      const filter = buildAccessFilter(user, [])
      expect(filter).toEqual(['free', 'regular', 'premium', 'enterprise'])
    })
  })
})
