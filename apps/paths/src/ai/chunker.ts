export interface ContentChunk {
  text: string
  index: number
  tokenCount: number
}

const MAX_CHUNK_TOKENS = 1500
const OVERLAP_TOKENS = 100

/**
 * Estimate token count from text (rough: ~4 chars per token for English).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Extract text from a single Lexical node and its children.
 */
function extractNodeText(node: any): string {
  if (node.type === 'text' && node.text) return node.text
  if (!node.children) return ''
  return node.children.map(extractNodeText).filter(Boolean).join(' ')
}

/**
 * Split text into fixed-size chunks with overlap.
 * Used as fallback when a section exceeds MAX_CHUNK_TOKENS.
 */
function fixedSizeChunk(text: string): string[] {
  const words = text.split(/\s+/)
  const wordsPerChunk = Math.floor(MAX_CHUNK_TOKENS * 0.75) // conservative
  const overlapWords = Math.floor(OVERLAP_TOKENS * 0.75)

  if (words.length <= wordsPerChunk) return [text]

  const chunks: string[] = []
  let start = 0
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length)
    chunks.push(words.slice(start, end).join(' '))
    start = end - overlapWords
    if (start >= words.length - overlapWords) {
      // Last chunk — include everything remaining
      if (end < words.length) {
        chunks.push(words.slice(end - overlapWords).join(' '))
      }
      break
    }
  }
  return chunks
}

/**
 * Semantically chunk Lexical JSON content at heading boundaries.
 *
 * Strategy:
 * 1. Split at H2 headings (each H2 section = a chunk)
 * 2. If no H2s, split at H3 headings
 * 3. If no headings, treat as a single chunk
 * 4. If any chunk exceeds MAX_CHUNK_TOKENS, fall back to fixed-size splitting
 */
export function chunkLexicalContent(content: any): ContentChunk[] {
  if (!content) return []

  const root = content.root ?? content
  if (!root?.children || root.children.length === 0) return []

  // Find heading level to split on
  const hasH2 = root.children.some(
    (n: any) => n.type === 'heading' && n.tag === 'h2',
  )
  const hasH3 = root.children.some(
    (n: any) => n.type === 'heading' && n.tag === 'h3',
  )
  const splitTag = hasH2 ? 'h2' : hasH3 ? 'h3' : null

  // Group nodes into sections
  const sections: any[][] = []
  let currentSection: any[] = []

  for (const node of root.children) {
    if (
      splitTag &&
      node.type === 'heading' &&
      node.tag === splitTag &&
      currentSection.length > 0
    ) {
      sections.push(currentSection)
      currentSection = [node]
    } else {
      currentSection.push(node)
    }
  }
  if (currentSection.length > 0) {
    sections.push(currentSection)
  }

  // Convert sections to chunks
  const chunks: ContentChunk[] = []
  let chunkIndex = 0

  for (const section of sections) {
    const sectionText = section
      .map(extractNodeText)
      .filter(Boolean)
      .join('\n\n')

    if (!sectionText.trim()) continue

    const tokens = estimateTokens(sectionText)

    if (tokens > MAX_CHUNK_TOKENS) {
      // Split oversized sections
      const subChunks = fixedSizeChunk(sectionText)
      for (const sub of subChunks) {
        if (sub.trim()) {
          chunks.push({
            text: sub.trim(),
            index: chunkIndex++,
            tokenCount: estimateTokens(sub),
          })
        }
      }
    } else {
      chunks.push({
        text: sectionText.trim(),
        index: chunkIndex++,
        tokenCount: tokens,
      })
    }
  }

  return chunks
}
