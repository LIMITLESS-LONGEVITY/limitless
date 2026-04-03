import { describe, it, expect } from 'vitest'
import { chunkLexicalContent } from '@/ai/chunker'

describe('Semantic chunker', () => {
  it('chunks by H2 headings', () => {
    const lexical = {
      root: {
        children: [
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Introduction' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'First section content.' }] },
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Methods' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Second section content.' }] },
        ],
      },
    }

    const chunks = chunkLexicalContent(lexical)
    expect(chunks).toHaveLength(2)
    expect(chunks[0].text).toContain('Introduction')
    expect(chunks[0].text).toContain('First section content.')
    expect(chunks[1].text).toContain('Methods')
    expect(chunks[1].text).toContain('Second section content.')
  })

  it('returns single chunk when no headings', () => {
    const lexical = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'No headings here.' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Just paragraphs.' }] },
        ],
      },
    }

    const chunks = chunkLexicalContent(lexical)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toContain('No headings here.')
  })

  it('returns empty array for null content', () => {
    expect(chunkLexicalContent(null)).toEqual([])
    expect(chunkLexicalContent(undefined)).toEqual([])
  })

  it('assigns sequential chunk indexes', () => {
    const lexical = {
      root: {
        children: [
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'A' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Content A.' }] },
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'B' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Content B.' }] },
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'C' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Content C.' }] },
        ],
      },
    }

    const chunks = chunkLexicalContent(lexical)
    expect(chunks[0].index).toBe(0)
    expect(chunks[1].index).toBe(1)
    expect(chunks[2].index).toBe(2)
  })

  it('estimates token count', () => {
    const lexical = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Hello world this is a test.' }] },
        ],
      },
    }

    const chunks = chunkLexicalContent(lexical)
    expect(chunks[0].tokenCount).toBeGreaterThan(0)
  })
})
