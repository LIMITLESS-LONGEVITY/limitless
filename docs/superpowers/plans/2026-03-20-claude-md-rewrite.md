# CLAUDE.md Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite CLAUDE.md from a duplicated build spec into a lean structured operator manual with behavioral protocols, verification gates, and cross-references.

**Architecture:** Replace the current 121-line CLAUDE.md (which duplicates content from `LIMITLESS_Website_Build_Prompt.md`) with a 7-section operator manual. Create a `.gitignore` to enforce file exclusions. Delete the two study case files after implementation.

**Tech Stack:** Markdown only. No tooling required.

**Spec:** `docs/superpowers/specs/2026-03-20-claude-md-rewrite-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `CLAUDE.md` | Rewrite | Operator manual — behavioral protocols, cross-references, verification gates |
| `.gitignore` | Create | Enforce exclusion of `.claude/`, PDFs, temp files |
| `CLAUDE_Cubes_Plus.md` | Delete | Study case — no longer needed after implementation |
| `CLAUDE_NEO_20032026.md` | Delete | Study case — no longer needed after implementation |

---

### Task 1: Create .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore` with project exclusions**

```
# Claude Code
.claude/

# Project briefs (tracked separately)
*.pdf

# Temporary files
*.tmp
*.bak

# OS files
Thumbs.db
.DS_Store

# Study case files (no longer needed)
CLAUDE_Cubes_Plus.md
CLAUDE_NEO_20032026.md
```

- [ ] **Step 2: Verify the file works**

Run: `git status`
Expected: `.gitignore` shows as new untracked file. `.claude/` directory and PDF files should no longer appear as untracked.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "Add .gitignore to exclude .claude/, PDFs, and temp files"
```

---

### Task 2: Rewrite CLAUDE.md

**Files:**
- Rewrite: `CLAUDE.md`
- Reference (read-only): `LIMITLESS_Website_Build_Prompt.md`
- Reference (read-only): `docs/superpowers/specs/2026-03-20-claude-md-rewrite-design.md`

Before starting, read the spec at `docs/superpowers/specs/2026-03-20-claude-md-rewrite-design.md` for the complete section-by-section design.

- [ ] **Step 1: Read current CLAUDE.md and the spec**

Read both files to understand what exists and what the target structure is.

- [ ] **Step 2: Write the new CLAUDE.md**

Replace the entire contents of `CLAUDE.md` with the 7-section operator manual. The complete content follows:

```markdown
# LIMITLESS Longevity Consultancy — Website

Single-page brand website for a boutique longevity consultancy. Targets C-suite executives and UHNW individuals. This is a digital business card — every pixel must reinforce trust, competence, and premium positioning.

- **Stack:** Single self-contained `index.html` — vanilla HTML5/CSS3/ES6+, no frameworks, no build tools
- **Live site:** GitHub Pages via CNAME
- **Design language:** "Scientific Luxury" — dark backgrounds, gold/teal accents, glassmorphism, generous whitespace

## Reference Files

| File | What's in it | When to read |
|------|-------------|--------------|
| `LIMITLESS_Website_Build_Prompt.md` | Full design system, copy text, section specs, color palette, typography, visual language | Before any visual/design/content work |
| `index.html` | The complete website (self-contained) | Before any code change |
| `CNAME` | Custom domain config | Do not modify |

**Rule:** Always read `LIMITLESS_Website_Build_Prompt.md` before making design or content changes. It is the authoritative source for colors, fonts, copy, and section specifications. Do not guess from memory.

## Execution Discipline

### Build Mode (default)
- Read the relevant section of `LIMITLESS_Website_Build_Prompt.md` before touching code
- Make the change. Keep it surgical — one concern at a time
- Verify before reporting done (see Verification Gate below)
- Report concisely: what changed, what to check visually

### Debug Mode (activate after 2 failed targeted fixes)
- STOP. Do not attempt a third narrow fix.
- Read the full chain: HTML structure → CSS rules → JS interactions affecting the broken area
- Write a short diagnosis: what's happening, why, what the fix should be
- Apply one surgical fix based on the diagnosis
- If that fails too: surface the problem to the user with your diagnosis, don't keep looping

### Anti-Loop Rule
- One strong first attempt
- One targeted second attempt if a specific issue was missed
- After 2 failures: Debug Mode — no exceptions, no "one more try"

## Verification Gate

Before claiming any work is complete, verify:

1. **Code validity:** No broken HTML tags, no unclosed elements, no console errors
2. **Responsive check:** Confirm the changed section works at 375px (mobile) and 1440px (desktop)
3. **Design consistency:** Changes match the design system in the build prompt — correct colors, fonts, spacing
4. **No side effects:** Scroll through adjacent sections to confirm nothing else broke
5. **Animation performance:** If animation was touched, confirm `prefers-reduced-motion` is respected
6. **Accessibility:** Interactive elements have ARIA labels, focus states visible, touch targets 44px+

For full code standards (semantic HTML, mobile-first CSS, max-width 1200px, no horizontal scrollbar), see the build prompt. Do not say "done" until you have mentally walked through this checklist against your changes. If you cannot verify something (e.g., needs a browser), flag it explicitly: "Needs visual verification: [what to check]"

## Git & Deployment

### Branch Strategy
- `main` branch deploys directly to GitHub Pages — treat it as production
- For small changes: commit directly to `main`
- For larger changes or risky work: create a feature branch, verify, then merge

### Commit Style
Follow the existing pattern (see git log):
- Start with action verb: Add, Update, Fix, Remove, Rename
- Describe what changed and why in plain language
- Example: `Fix mobile nav overlay z-index conflicting with hero canvas`

### Deployment
- GitHub Pages auto-deploys from `main` branch
- Live site: check CNAME file for domain
- After pushing to `main`, changes are live within minutes
- Never force-push to `main`

### What NOT to commit
- `.claude/` directory
- PDF files (project briefs tracked separately)
- Temporary test files

These exclusions are enforced by `.gitignore`.

## Gotchas & Known Issues

- **Single file architecture:** `index.html` is a large single file — be precise about which `<style>` or `<script>` block you're in when making edits
- **Canvas particle network:** The hero animation uses vanilla Canvas API. Changes to hero dimensions or layout can break particle positioning. Always test after hero modifications.
- **Glassmorphism browser support:** `backdrop-filter` needs `-webkit-backdrop-filter` for Safari compatibility
- **Google Fonts load order:** Cormorant Garamond and Inter are loaded via Google Fonts CDN. If fonts appear wrong, check the `<link>` tags haven't been accidentally modified.
- **Founder photos:** Real photos are in `Images/` directory. If a photo is missing, fall back to the gradient circle with gold initials pattern.
- **CNAME file:** Do not delete or modify — it controls the custom domain for GitHub Pages

## Important Reminders

- This is a brand/credibility site — not SaaS, not e-commerce. The audience judges LIMITLESS's consulting quality by the website quality.
- Less is more — 5 beautiful sections beat 10 mediocre ones
- No stock photos of people in lab coats
- Brand name in headers/logo: **LIMITLESS** (always uppercase, wide letter-spacing). In body copy: "Limitless Longevity Consultancy"
- When in doubt about content or design decisions, refer back to the build prompt — don't improvise
```

- [ ] **Step 3: Verify the new CLAUDE.md**

Check:
- File is under 140 lines
- No content duplicates the build prompt (no color hex codes, no typography specs, no site structure list)
- All 7 sections present: Project Identity, Reference Files, Execution Discipline, Verification Gate, Git & Deployment, Gotchas, Important Reminders
- Cross-reference to build prompt appears in Reference Files and Verification Gate

Run: `wc -l CLAUDE.md`
Expected: Under 140 lines

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Rewrite CLAUDE.md as structured operator manual with behavioral protocols"
```

---

### Task 3: Clean up study case files

**Files:**
- Delete: `CLAUDE_Cubes_Plus.md`
- Delete: `CLAUDE_NEO_20032026.md`

- [ ] **Step 1: Delete the study case files**

```bash
rm CLAUDE_Cubes_Plus.md CLAUDE_NEO_20032026.md
```

- [ ] **Step 2: Verify they're gone**

Run: `ls CLAUDE*.md`
Expected: Only `CLAUDE.md` remains

- [ ] **Step 3: Commit**

```bash
git add CLAUDE_Cubes_Plus.md CLAUDE_NEO_20032026.md
git commit -m "Remove study case CLAUDE.md files — no longer needed"
```

---

## Verification Checklist (after all tasks)

- [ ] `.gitignore` exists and excludes `.claude/`, `*.pdf`, temp files
- [ ] `CLAUDE.md` is under 140 lines
- [ ] `CLAUDE.md` contains zero duplicated content from the build prompt
- [ ] All 7 sections are present in order
- [ ] Study case files are deleted
- [ ] All changes committed with descriptive messages
- [ ] `git status` is clean
