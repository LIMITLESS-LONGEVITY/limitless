/**
 * PATHS Platform Guide — Screenshot Verification Script
 *
 * Parses all MDX guide files for <Screenshot> references and verifies
 * that corresponding image files exist in public/guide/screenshots/.
 *
 * Usage:
 *   npx tsx scripts/verify-guide-screenshots.ts
 *   npx tsx scripts/verify-guide-screenshots.ts --external-only
 */

import * as fs from 'fs'
import * as path from 'path'

const GUIDE_DIR = path.join(process.cwd(), 'content', 'guide')
const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'guide', 'screenshots')
const EXTERNAL_MANIFEST = path.join(process.cwd(), 'scripts', 'external-screenshots.json')

const SCREENSHOT_REGEX = /<Screenshot\s+[^>]*src="([^"]+)"/g

interface ExternalEntry {
  path: string
  source: string
  capturedDate: string
  notes?: string
}

interface VerificationResult {
  referenced: Map<string, string[]> // src -> list of MDX files referencing it
  found: string[]
  missing: string[]
  external: ExternalEntry[]
  externalMissing: string[]
  externalStale: ExternalEntry[]
  orphaned: string[]
}

function findMdxFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findMdxFiles(fullPath))
    } else if (entry.name.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }
  return files
}

function extractScreenshotRefs(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const refs: string[] = []
  let match: RegExpExecArray | null
  const regex = new RegExp(SCREENSHOT_REGEX.source, 'g')
  while ((match = regex.exec(content)) !== null) {
    refs.push(match[1])
  }
  return refs
}

function findScreenshotFiles(dir: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findScreenshotFiles(fullPath))
    } else if (entry.name.endsWith('.png')) {
      files.push(path.relative(SCREENSHOT_DIR, fullPath).replace(/\\/g, '/'))
    }
  }
  return files
}

function loadExternalManifest(): ExternalEntry[] {
  if (!fs.existsSync(EXTERNAL_MANIFEST)) return []
  const raw = fs.readFileSync(EXTERNAL_MANIFEST, 'utf-8')
  return JSON.parse(raw) as ExternalEntry[]
}

function verify(): VerificationResult {
  const mdxFiles = findMdxFiles(GUIDE_DIR)
  const referenced = new Map<string, string[]>()
  const externalManifest = loadExternalManifest()
  const externalPaths = new Set(externalManifest.map((e) => e.path))

  // Collect all screenshot references from MDX files
  for (const mdxFile of mdxFiles) {
    const refs = extractScreenshotRefs(mdxFile)
    const relPath = path.relative(GUIDE_DIR, mdxFile).replace(/\\/g, '/')
    for (const ref of refs) {
      const existing = referenced.get(ref) || []
      existing.push(relPath)
      referenced.set(ref, existing)
    }
  }

  // Check which referenced files exist
  const found: string[] = []
  const missing: string[] = []
  const externalMissing: string[] = []

  for (const src of referenced.keys()) {
    if (externalPaths.has(src)) {
      const filePath = path.join(SCREENSHOT_DIR, src)
      if (!fs.existsSync(filePath)) {
        externalMissing.push(src)
      }
      continue
    }
    const filePath = path.join(SCREENSHOT_DIR, src)
    if (fs.existsSync(filePath)) {
      found.push(src)
    } else {
      missing.push(src)
    }
  }

  // Check for stale external screenshots (> 90 days)
  const now = Date.now()
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000
  const externalStale = externalManifest.filter((entry) => {
    const capturedAt = new Date(entry.capturedDate).getTime()
    return now - capturedAt > NINETY_DAYS
  })

  // Find orphaned screenshots (files not referenced by any MDX)
  const allFiles = findScreenshotFiles(SCREENSHOT_DIR)
  const referencedSet = new Set(referenced.keys())
  const orphaned = allFiles.filter((f) => !referencedSet.has(f))

  return { referenced, found, missing, external: externalManifest, externalMissing, externalStale, orphaned }
}

function main() {
  const externalOnly = process.argv.includes('--external-only')
  const result = verify()

  const totalReferenced = result.referenced.size
  const externalPaths = new Set(result.external.map((e) => e.path))
  const internalReferenced = [...result.referenced.keys()].filter((k) => !externalPaths.has(k)).length

  console.log('╔═══════════════════════════════════════════════════╗')
  console.log('║   PATHS Guide — Screenshot Verification           ║')
  console.log('╚═══════════════════════════════════════════════════╝')
  console.log()

  if (!externalOnly) {
    console.log(`References found:  ${totalReferenced} (${internalReferenced} internal, ${externalPaths.size} external)`)
    console.log(`Internal present:  ${result.found.length}/${internalReferenced}`)
    console.log()

    if (result.found.length > 0) {
      console.log('✓ Internal screenshots found:')
      for (const src of result.found.sort()) {
        console.log(`    ${src}`)
      }
      console.log()
    }

    if (result.missing.length > 0) {
      console.log('✗ Missing internal screenshots:')
      for (const src of result.missing.sort()) {
        const files = result.referenced.get(src) || []
        console.log(`    ${src}`)
        for (const f of files) {
          console.log(`      ← ${f}`)
        }
      }
      console.log()
    }
  }

  // External screenshot report
  if (result.external.length > 0) {
    console.log(`External screenshots: ${result.external.length} in manifest`)
    for (const entry of result.external) {
      const age = Math.floor((Date.now() - new Date(entry.capturedDate).getTime()) / (24 * 60 * 60 * 1000))
      const stale = age > 90 ? ' ⚠ STALE' : ''
      const exists = fs.existsSync(path.join(SCREENSHOT_DIR, entry.path)) ? '✓' : '✗'
      console.log(`    ${exists} ${entry.path} (${age}d old${stale})`)
    }
    console.log()
  }

  if (result.externalMissing.length > 0) {
    console.log('⚠ External screenshots missing files:')
    for (const src of result.externalMissing) {
      console.log(`    ${src}`)
    }
    console.log()
  }

  if (result.externalStale.length > 0) {
    console.log('⚠ External screenshots older than 90 days:')
    for (const entry of result.externalStale) {
      console.log(`    ${entry.path} — captured ${entry.capturedDate} (${entry.source})`)
    }
    console.log()
  }

  if (result.orphaned.length > 0) {
    console.log('⚠ Orphaned screenshots (not referenced by any MDX):')
    for (const src of result.orphaned.sort()) {
      console.log(`    ${src}`)
    }
    console.log()
  }

  // Summary
  if (!externalOnly && result.missing.length > 0) {
    console.log(`❌ ${result.missing.length} internal screenshot(s) missing — failing verification.`)
    process.exit(1)
  }

  if (externalOnly) {
    const issues = result.externalMissing.length + result.externalStale.length
    if (issues > 0) {
      console.log(`⚠ ${issues} external screenshot issue(s) found.`)
      process.exit(1)
    }
  }

  console.log('✅ All internal screenshots verified.')
}

main()
