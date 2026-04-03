/**
 * Build Guide Search Index
 *
 * Reads all MDX guide files and generates a search index JSON file.
 *
 * Usage: npx tsx scripts/build-guide-search-index.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const GUIDE_DIR = path.join(process.cwd(), 'content', 'guide')
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'guide', 'search-index.json')

type SearchEntry = {
  role: string
  topic: string
  title: string
  description: string
  body: string
  headings: string[]
  url: string
}

function extractFrontmatter(content: string): { title: string; description: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { title: '', description: '', body: content }

  const frontmatter = match[1]
  const body = match[2]

  const titleMatch = frontmatter.match(/title:\s*['"]?(.+?)['"]?\s*$/)
  const descMatch = frontmatter.match(/description:\s*['"]?(.+?)['"]?\s*$/)

  return {
    title: titleMatch?.[1]?.replace(/^['"]|['"]$/g, '') || '',
    description: descMatch?.[1]?.replace(/^['"]|['"]$/g, '') || '',
    body,
  }
}

function extractHeadings(body: string): string[] {
  const headingRegex = /^#{1,3}\s+(.+)$/gm
  const headings: string[] = []
  let match
  while ((match = headingRegex.exec(body)) !== null) {
    headings.push(match[1].trim())
  }
  return headings
}

function stripMdx(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // Remove JSX/HTML tags
    .replace(/\{[^}]+\}/g, '') // Remove JSX expressions
    .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/^[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\n{2,}/g, '\n') // Collapse multiple newlines
    .trim()
}

function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = []

  if (!fs.existsSync(GUIDE_DIR)) {
    console.error('Guide directory not found:', GUIDE_DIR)
    process.exit(1)
  }

  const roleDirs = fs.readdirSync(GUIDE_DIR).filter((d) => {
    const fullPath = path.join(GUIDE_DIR, d)
    return fs.statSync(fullPath).isDirectory()
  })

  for (const role of roleDirs) {
    const roleDir = path.join(GUIDE_DIR, role)
    const files = fs.readdirSync(roleDir).filter((f) => f.endsWith('.mdx'))

    for (const file of files) {
      const topic = file.replace('.mdx', '')
      const filePath = path.join(roleDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')

      const { title, description, body } = extractFrontmatter(content)
      const headings = extractHeadings(body)
      const plainBody = stripMdx(body).slice(0, 300)

      entries.push({
        role,
        topic,
        title: title || topic,
        description: description || '',
        body: plainBody,
        headings,
        url: `/guide/${role}/${topic}`,
      })
    }
  }

  return entries
}

// Main
const entries = buildIndex()

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2))
console.log(`✅ Guide search index built: ${entries.length} entries → ${OUTPUT_FILE}`)
