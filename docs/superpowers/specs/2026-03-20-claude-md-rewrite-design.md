# Design: CLAUDE.md Rewrite — Structured Operator Manual

**Date:** 2026-03-20
**Status:** Draft
**Approach:** B — Structured Operator Manual

## Problem

The current CLAUDE.md duplicates content from `LIMITLESS_Website_Build_Prompt.md` (design system, color palette, typography, site structure, brand copy) and lacks operational guidance for how Claude should work on this project. It reads as a build spec rather than an operator manual.

## Goals

1. Eliminate duplicated specs — cross-reference the build prompt instead
2. Add behavioral protocols (build mode, debug mode, anti-loop)
3. Add a verification gate so Claude self-checks before claiming done
4. Add git/deployment workflow (previously missing)
5. Add gotchas section to prevent repeated mistakes
6. Keep the file lean (~120 lines) so Claude reads it fully each session

## Study Cases

Two CLAUDE.md files from other projects were analyzed:

- **Cubes+**: Good patterns — core philosophy, cross-references to docs, build commands, gotchas & known issues, current focus section
- **NEO Empire**: Good patterns — anti-drift guardrails, document authority hierarchy, execution discipline (build vs debug mode), anti-loop rule, verification gates, surgical fix standards

Approach B takes the best of both without the governance overhead NEO needs for its multi-file Electron app.

## Proposed Structure

### Section 1: Project Identity

Short orientation block (~5 lines). What the project is, the stack, the design language. Enough to set Claude's mental model without duplicating specs.

Content:
- Single-page brand website for boutique longevity consultancy
- Targets C-suite executives and UHNW individuals
- Stack: single self-contained `index.html`, vanilla HTML5/CSS3/ES6+, no frameworks
- Live on GitHub Pages
- Design language: "Scientific Luxury"

### Section 2: Reference Files

Table of key files with what they contain and when to read them.

| File | What's in it | When to read |
|------|-------------|--------------|
| `LIMITLESS_Website_Build_Prompt.md` | Full design system, copy, section specs, colors, typography | Before any visual/design/content work |
| `index.html` | The complete website | Before any code change |
| `CNAME` | Custom domain config | Do not modify |

Golden rule: Always read the build prompt before design or content changes. It is the authoritative source. Do not guess from memory.

### Section 3: Execution Discipline

Three modes adapted from NEO's execution discipline, scaled down for this project:

**Build Mode (default):**
- Read relevant section of build prompt before touching code
- Make the change surgically — one concern at a time
- Verify before reporting done
- Report concisely: what changed, what to check visually

**Debug Mode (activates after 2 failed targeted fixes):**
- Stop. Do not attempt a third narrow fix.
- Read the full chain: HTML structure, CSS rules, JS interactions
- Write a short diagnosis
- Apply one surgical fix based on diagnosis
- If that fails: surface problem to user with diagnosis

**Anti-Loop Rule:**
- One strong first attempt
- One targeted second attempt if specific issue was missed
- After 2 failures: Debug Mode, no exceptions

### Section 4: Verification Gate

Mandatory checklist before claiming work is complete. Adapted from current CLAUDE.md's quality checklist, made into a gate:

1. Code validity — no broken HTML, no unclosed elements, no console errors
2. Responsive check — changed section works at 375px and 1440px
3. Design consistency — matches design system in build prompt
4. No side effects — adjacent sections not broken
5. Animation performance — `prefers-reduced-motion` respected
6. Accessibility — ARIA labels, focus states, 44px touch targets

For full code standards (semantic HTML, mobile-first CSS, max-width 1200px, no horizontal scrollbar), see the build prompt. If something can't be verified by Claude (needs browser), flag explicitly.

### Section 5: Git & Deployment

Previously missing entirely. Derived from actual repo setup:

- `main` deploys to GitHub Pages (production)
- Small changes: commit to `main`. Larger/risky: feature branch first
- Commit style: action verb + description (matches existing history)
- Never force-push to `main`
- Exclusions: `.claude/`, PDFs, temp files. Note: ensure `.gitignore` covers these (creating `.gitignore` is part of this work if it doesn't exist)

### Section 6: Gotchas & Known Issues

Hard-won knowledge from the actual codebase (inspired by Cubes+):

- Single file architecture: `index.html` is a large single file — be precise about which `<style>` or `<script>` block you're in
- Canvas particle network: hero changes can break particle positioning
- `backdrop-filter` needs `-webkit-` prefix for Safari
- Google Fonts load order: don't accidentally modify `<link>` tags
- Founder photos in `Images/`, fallback to gradient circles with gold initials
- CNAME file: do not delete or modify

### Section 7: Important Reminders

Taste and judgment guardrails (kept from current CLAUDE.md):

- Brand/credibility site, not SaaS — website quality = consulting quality
- Less is more
- No stock photos of people in lab coats
- Brand name rules (LIMITLESS uppercase in headers, "Limitless Longevity Consultancy" in body)
- When in doubt, refer to build prompt

## What Gets Removed / Replaced

Every section in the current CLAUDE.md is accounted for below:

| Current Section | Disposition |
|----------------|-------------|
| About This Project | **Replaced by** Section 1 (Project Identity) — condensed to 5 lines |
| Technology Stack | **Replaced by** Section 1 (Project Identity) — one-line stack summary |
| Design System (color palette, typography, visual language) | **Removed** — lives in build prompt, cross-referenced via Section 2 |
| Site Structure (8 numbered items) | **Removed** — lives in build prompt |
| Code Standards | **Removed** — lives in build prompt; key items pulled into Verification Gate (Section 4). Gate includes note: "For full code standards, see build prompt" |
| Performance Targets | **Removed** — lives in build prompt |
| Brand Copy Rules | **Removed** — key points (brand name formatting) kept in Section 7 (Reminders) |
| Placeholders | **Removed** — lives in build prompt |
| Key Files table | **Replaced by** Section 2 (Reference Files) — expanded with read-when guidance |
| Quality Checklist | **Replaced by** Section 4 (Verification Gate) — transformed into mandatory gate |
| Important Reminders | **Kept** as Section 7 — taste/judgment guardrails retained |

## What Gets Added (new)

- Execution Discipline (build/debug/anti-loop)
- Verification Gate
- Git & Deployment workflow
- Gotchas & Known Issues
- Reference Files table with read-when guidance

## Estimated Size

~120 lines. Roughly the same length as current file but dramatically more useful per line.

## Success Criteria

1. The rewritten CLAUDE.md is under 140 lines (short enough to read in full each session)
2. The CLAUDE.md contains no content that duplicates the build prompt (auditable by diff)
3. Execution discipline section includes build mode, debug mode, and anti-loop rule
4. Verification gate checklist is present and references the build prompt for full code standards
5. Git & deployment section covers branch strategy, commit style, and exclusions
6. Gotchas section captures at least 5 codebase-specific known issues
