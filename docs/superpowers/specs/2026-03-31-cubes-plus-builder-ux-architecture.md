# Cubes+ Builder v2 — UX Architecture Spec

**Date:** 2026-03-31
**Author:** Frontend/UX Architecture Review
**Scope:** Drag-and-drop builder for training routine composition
**Codebase reviewed:** `cubes-plus/frontend/src/` — 4,252 lines across builder-specific files, ~16K total frontend

---

## 1. Current Builder Assessment

### What Exists

The builder lives on the home page (`src/app/page.tsx`, 931 lines) and orchestrates five child components:

| Component | Lines | Purpose |
|-----------|-------|---------|
| `builder-canvas.tsx` | 533 | Drop zone with sortable items, nested routine containers |
| `repository-panel.tsx` | 367 | Searchable/filterable entity browser (reused 3x) |
| `detail-drawer.tsx` | 468 | Sheet-based entity detail with actions |
| `save-dialog.tsx` | 512 | Full metadata form + smart save logic |
| `mode-transition-dialog.tsx` | 44 | Confirmation for mode switching |

In addition, there are 4 form-based CRUD pages (`routines/new`, `routines/[id]/edit`, `super-routines/new`, `super-routines/[id]/edit`) totaling ~1,400 lines that duplicate builder logic without drag-and-drop.

### What Works Well

1. **Dual interaction model.** Items can be added via drag-and-drop OR via the "+" button. This is critical for tablet users who find precision dragging difficult.

2. **Mode auto-detection.** Builder mode (`routine` vs `super-routine`) is derived from the first item's type, not a manual toggle. Clean and intuitive.

3. **Nested composition in super-routine mode.** Routines render as expandable containers with their own SortableContext, allowing per-routine cube editing. The `CubePickerPopover` for adding cubes inline is well-designed.

4. **Smart save logic.** The `SaveDialog` detects modified routines inside a super-routine, auto-updates owned routines, and auto-duplicates others' routines. This ownership-aware save pipeline is sophisticated and should be preserved.

5. **Mode transition handling.** When a coach drops a routine onto a builder full of cubes, the system offers to save current work as a routine first. This prevents data loss.

6. **Cypress test coverage.** 14 E2E test files exist, with `03c-builder-routines.cy.ts` covering core builder flows.

### What Does Not Work

1. **Monolithic orchestrator.** `page.tsx` is 931 lines of state + callbacks. No state management library — everything is `useState` + `useCallback` + prop-drilling through 6+ levels. This makes the builder fragile to extend.

2. **No undo/redo.** Accidental removes or reorders cannot be reversed. For a creative tool, this is a significant UX gap.

3. **No auto-save or draft persistence.** Refreshing the page loses all builder state. Coaches building complex routines risk losing work.

4. **No keyboard DnD support.** `PointerSensor` only — no `KeyboardSensor` configured. Keyboard users and screen reader users cannot reorder items.

5. **Performance at scale.** Repository panels fetch up to 100 items with no virtualization (`page_size: 100`). All items render in a `ScrollArea` — no windowing. With 500+ cubes in production, this will degrade.

6. **Duplicated CRUD pages.** `routines/new/page.tsx`, `routines/[id]/edit/page.tsx`, and their super-routine equivalents implement selection/ordering with manual up/down buttons instead of reusing the builder canvas. This is ~1,400 lines of code that should not exist separately.

7. **4-panel layout confusion.** Desktop renders as `[super-routines | builder+routines | cubes]` — the center column is split 50/50 between builder and routines. This gives the builder canvas only 25% of screen width on a 1440px display, which is too narrow for the primary workspace.

8. **Tab-based mobile is non-functional for building.** The tablet layout shows one panel at a time via tabs. A coach must switch between "Cubes" tab (to find items) and "Builder" tab (to see what they have) — they cannot see both simultaneously. This makes drag-and-drop impossible on tablets.

9. **No template/preset system.** Every routine starts from scratch. No way to start from a template or clone a published routine into the builder.

10. **No phase structure.** All cubes are a flat ordered list. There is no concept of warm-up/main/cooldown zones. Coaches mentally partition their routines but the tool does not support this.

11. **Auth via localStorage tokens.** The API client stores JWT in `localStorage` with Bearer auth. The v2 platform (under LIMITLESS umbrella) will use cookie-based SSO on `.limitless-longevity.health`. The entire auth layer needs replacement.

---

## 2. Component Inventory — PORT / REFACTOR / REWRITE

| Component | Verdict | Rationale |
|-----------|---------|-----------|
| `BuilderCanvas` | **REFACTOR** | Good structure, but needs phase zones, undo integration, keyboard DnD, and should not own the SortableContext (move to parent) |
| `RepositoryPanel` | **REFACTOR** | Solid pattern, needs virtualized list, pagination/infinite scroll, and extraction of filter state into a hook |
| `DetailDrawer` | **PORT** | Clean Sheet-based component. Only needs API call migration from fetch+Bearer to cookie auth |
| `SaveDialog` | **REFACTOR** | Smart save logic is good but tightly coupled to `BuilderItem` shape. Extract save pipeline into a hook; add template-save-as flow |
| `ModeTransitionDialog` | **PORT** | 44 lines, pure UI. Direct port. |
| `page.tsx` (orchestrator) | **REWRITE** | 931 lines of interleaved state. Replace with Zustand store + thin page component |
| `routines/new/page.tsx` | **REWRITE (delete)** | Replace with builder route. No need for separate form page. |
| `routines/[id]/edit/page.tsx` | **REWRITE (delete)** | Same — load into builder instead. |
| `super-routines/new/page.tsx` | **REWRITE (delete)** | Same. |
| `super-routines/[id]/edit/page.tsx` | **REWRITE (delete)** | Same. |
| `TopNav` | **REWRITE** | Hardcoded nav items, no responsive collapse, renders identically for all roles. Rebuild with LIMITLESS unified header pattern. |
| `use-auth.tsx` | **REWRITE** | localStorage JWT must become cookie SSO. |
| `lib/api/client.ts` | **REWRITE** | Bearer token extraction → cookie-based `credentials: 'include'`. |
| `lib/api/cubes.ts` | **PORT** | Thin wrappers. Just change the base client. |
| `lib/api/routines.ts` | **PORT** | Same. |
| `lib/api/super-routines.ts` | **PORT** | Same. |
| `lib/types/*` | **PORT** | TypeScript interfaces are API-shape-aligned. Port directly unless API changes. |
| `DraggableCard` (inside RepositoryPanel) | **REFACTOR** | Good UX pattern, but needs accessibility attributes and should become its own file. |
| `RoutineContainer` (inside BuilderCanvas) | **REFACTOR** | Nested sortable works well. Extract to own file. Add phase awareness. |
| `CubePickerPopover` (inside BuilderCanvas) | **PORT** | Clean inline search component. |
| `AssignDialog` | **PORT** | Works as-is, just needs API migration. |
| Landing page components | **REWRITE** | New brand, new marketing page for Cubes+. |
| Cypress tests | **REFACTOR** | Good coverage patterns, but selectors and auth will change. |

**Summary:** ~40% can be ported or lightly refactored. ~30% needs significant refactoring. ~30% needs full rewrite (mostly the orchestration layer, auth, and eliminated pages).

---

## 3. v2 Builder Architecture

### State Management: Zustand

Replace the 931-line page.tsx with a Zustand store:

```
src/
  stores/
    builder-store.ts       # Core builder state + actions
    builder-history.ts     # Undo/redo middleware
  hooks/
    use-builder.ts         # Selector hooks for components
    use-builder-dnd.ts     # DnD event handlers
    use-repository.ts      # Repository fetch + filter state
```

**Store shape:**

```typescript
interface BuilderStore {
  // Canvas state
  items: BuilderItem[]
  mode: 'empty' | 'routine' | 'super-routine'
  editingEntity: { id: string; name: string; creatorId: string; type: 'routine' | 'super-routine' } | null
  isDirty: boolean

  // Phase structure
  phases: Phase[]  // [{id, label, itemKeys[]}]

  // Draft persistence
  draftId: string | null
  lastSavedAt: Date | null

  // Actions
  addItem: (item: BuilderItem, phaseId?: string) => void
  removeItem: (key: string) => void
  reorderItems: (activeKey: string, overKey: string) => void
  addCubeToRoutine: (routineKey: string, cube: BuilderCube) => void
  removeCubeFromRoutine: (routineKey: string, cubeKey: string) => void
  reorderCubesInRoutine: (routineKey: string, activeKey: string, overKey: string) => void
  clear: () => void
  loadRoutine: (routineId: string) => Promise<void>
  loadSuperRoutine: (superRoutineId: string) => Promise<void>
  loadTemplate: (templateId: string) => Promise<void>

  // Undo/redo
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  // Draft
  saveDraft: () => void
  loadDraft: () => void
  clearDraft: () => void
}
```

**Undo/redo:** Zustand temporal middleware. Stores snapshots of `items` and `phases` arrays. Cap at 50 history entries.

**Auto-save drafts:** `localStorage` key `cubes-builder-draft`. Debounced write (2s after last change). On page load, if draft exists, prompt: "Resume unsaved work?"

### Data Flow

```
RepositoryPanel ──(drag/click)──> BuilderStore.addItem()
                                        │
BuilderCanvas <──(subscribe)────────────┘
       │
       ├── PhaseZone (warm-up)
       │     └── SortableItem / RoutineContainer
       ├── PhaseZone (main)
       │     └── SortableItem / RoutineContainer
       └── PhaseZone (cooldown)
             └── SortableItem / RoutineContainer
                                        │
SaveDialog <──(subscribe)───── BuilderStore.items + phases
       │
       └── routinesApi / superRoutinesApi
```

### Route Structure

```
/builder              # Main builder page (replaces home page for authenticated users)
/builder?load=routine:abc123     # Deep-link to edit a routine
/builder?load=super-routine:xyz  # Deep-link to edit a super-routine
/builder?template=hiit-basic     # Start from template
/library/cubes        # Browse cubes (replaces /cubes)
/library/routines     # Browse routines (replaces /routines)
/library/super-routines
/library/templates    # Browse templates
/[entity]/[id]        # Detail pages (keep as-is)
```

Eliminate `/routines/new`, `/routines/[id]/edit`, `/super-routines/new`, `/super-routines/[id]/edit` entirely. All creation and editing flows go through `/builder`.

---

## 4. Layout Recommendation

### Recommended: 3-Panel Layout with Collapsible Library

```
Desktop (>= 1280px):
+------------------+-----------------------------------+------------------+
|                  |                                   |                  |
|  LIBRARY PANEL   |        BUILDER CANVAS             | PROPERTIES PANEL |
|  (collapsible)   |                                   | (context-aware)  |
|                  |        [Phase: Warm-Up]           |                  |
|  [Tabs]          |        +-item-+-item-+            | Shows:           |
|  Cubes|Routines  |                                   | - Selected item  |
|  |Templates      |        [Phase: Main]              |   details        |
|                  |        +-item-+-item-+             | - Phase props    |
|  [Search]        |        +-item-+                   | - Routine meta   |
|  [Filters]       |                                   |   when saving    |
|  +--card--+      |        [Phase: Cooldown]          |                  |
|  +--card--+      |        +-item-+                   | [Quick edit]     |
|  +--card--+      |                                   | [Preview]        |
|  +--card--+      |                                   |                  |
|                  |  [Duration: 45m] [Undo] [Redo]   |                  |
|                  |  [Clear] [Save] [Preview]         |                  |
+------------------+-----------------------------------+------------------+
     280px               flex-1 (min 500px)                  320px
```

**Why 3-panel, not 4-panel:**
- The current 4-panel layout (`super-routines | builder+routines | cubes`) forces the builder into 25% width. The most important workspace gets the least space.
- With tabs in the library panel (Cubes / Routines / Templates), one panel replaces three. The coach switches tabs rather than scanning across 3 narrow columns.
- The properties panel on the right replaces the current detail drawer (Sheet), giving persistent context without overlay.
- Super-routines are accessed via the Routines tab — no dedicated panel needed.

**Tablet (1024-1279px):**

```
+------------------+-----------------------------------+
|                  |                                   |
|  LIBRARY PANEL   |        BUILDER CANVAS             |
|  (240px)         |        + bottom toolbar           |
|                  |                                   |
+------------------+-----------------------------------+
```

Properties panel collapses into a bottom sheet triggered by tapping an item. Library panel stays visible at reduced width. This is the minimum viable tablet experience — coaches CAN build on iPad.

**Mobile (< 1024px):**

```
+-----------------------------------+
|  BUILDER CANVAS (full width)      |
|                                   |
|  [+ Add] opens library sheet     |
|  Tap item → bottom sheet props   |
+-----------------------------------+
```

Mobile is build-capable but optimized for viewing/running routines. The "+ Add" button opens a full-screen sheet with the library. Properties open as a bottom sheet.

### Why Not 2-Panel (Library + Canvas)?

A 2-panel layout omits the properties panel, forcing everything into modals/drawers. For a creative builder tool, persistent context (seeing the details of the selected item while building) reduces cognitive load. The 3-panel layout is standard for builder tools (Figma, Notion, Webflow).

---

## 5. Template System Design

### User Experience

When a coach opens the builder with an empty canvas, they see:

```
+-------------------------------------------+
|                                           |
|   Start Building                          |
|                                           |
|   [  Start from Scratch  ]               |
|                                           |
|   -- or choose a template --              |
|                                           |
|   [HIIT Session]    [Strength Training]   |
|   [Yoga Flow]       [Warm-Up + Cooldown]  |
|   [Sport-Specific]  [Recovery Session]    |
|                                           |
|   [Browse All Templates...]               |
|                                           |
+-------------------------------------------+
```

### Template Types

1. **System Templates** — Created by the platform team. Curated starting points. Cannot be edited but can be loaded into builder.
2. **Published Templates** — Any active routine/super-routine can be "published as template" by its creator. Shows in the template library with attribution.
3. **Organization Templates** — A gym or coaching org can maintain shared templates for their coaches.

### Data Model

Templates are not a separate entity — they are routines or super-routines with `is_template: true` and `template_category: string`. Loading a template into the builder creates a deep copy (new IDs, current user as creator).

```typescript
interface TemplateMetadata {
  is_template: boolean
  template_category: string | null  // "hiit", "strength", "yoga", "warmup", "recovery", "sport"
  template_description: string | null
  template_thumbnail_url: string | null
  use_count: number  // how many routines were created from this template
}
```

### Flow

1. Coach clicks "HIIT Session" template
2. Builder loads the template's cubes/routines into the canvas
3. Phase zones are pre-populated (warm-up: 2 cubes, main: 6 cubes, cooldown: 2 cubes)
4. Coach modifies as needed
5. On save, a new routine is created (the template is not modified)

---

## 6. Phase Structure Design

### Concept

Phases are structural zones within the builder canvas that group items by training purpose. They are optional but encouraged.

### Default Phases

When a coach starts building (or loads a template), three default phases appear:

```
[Warm-Up]        ← collapsible, color: amber
  (drag items here)

[Main]           ← collapsible, color: blue  
  (drag items here)

[Cooldown]       ← collapsible, color: green
  (drag items here)
```

### Behavior

- **Items can be dragged between phases.** A cube in warm-up can be moved to main.
- **Phases are optional.** A coach can remove all phases (flat list mode) or add custom phases.
- **Custom phases.** "+ Add Phase" button at the bottom. Coach names it (e.g., "Mobility", "Skills", "Conditioning").
- **Phase duration.** Each phase shows its total duration (sum of contained items).
- **Visual differentiation.** Each phase has a subtle color accent on its left border and header.
- **Persistence.** Phases are stored as metadata on the routine:

```typescript
interface RoutinePhase {
  id: string
  label: string
  position: number
  item_positions: number[]  // indices into the flat cube_ids array
}
```

This keeps the existing API contract intact — `cube_ids` remains a flat array with positions. Phases are stored as a separate JSON field `phases` on the routine.

### Super-Routine Phases

In super-routine mode, phases apply to routines rather than cubes:

```
[Morning Session]
  ├── Warm-Up Routine
  └── Strength Routine

[Afternoon Session]
  ├── Cardio Routine
  └── Cooldown Routine
```

This maps to training program periodization (AM/PM splits, day splits, etc.).

---

## 7. Collaboration Strategy

### Recommendation: No real-time collaboration in v2.

**Rationale:**

1. **User base.** Cubes+ targets individual coaches and small coaching teams. The typical editing pattern is one coach building their own routines. Multi-editor scenarios (two coaches editing the same routine simultaneously) are rare.

2. **Technical cost.** Real-time collaboration requires:
   - WebSocket infrastructure (persistent connections)
   - CRDT or OT for conflict resolution on ordered lists
   - Presence awareness UI
   - This is 2-3 months of engineering for a feature with low demand.

3. **Sufficient alternative.** The duplicate + ownership model already handles team workflows:
   - Coach A creates a routine
   - Coach B duplicates it, modifies, saves as their own
   - The "Published as Template" system provides sharing without co-editing

### What to Build Instead

- **Activity feed on entities.** "Coach Maria edited this routine 2 hours ago" — awareness without real-time sync.
- **Lock indicator.** When a routine is open in someone's builder, show a soft lock: "Currently being edited by Coach Maria." No enforcement, just awareness.
- **Comment thread on routines.** Async collaboration via comments (like Google Docs comments, not real-time editing).

### v3 Consideration

If the user base grows to large organizations (50+ coaches), reassess. At that point, consider Liveblocks or Yjs for multiplayer, with the builder store as the CRDT document.

---

## 8. Mobile/Tablet Strategy

### Device Tiers

| Device | Viewport | Build Capability | Primary Use |
|--------|----------|------------------|-------------|
| Desktop | >= 1280px | Full builder (3-panel) | Create, edit, manage |
| Tablet landscape | 1024-1279px | Full builder (2-panel) | Create, edit on the go |
| Tablet portrait | 768-1023px | Simplified builder | Quick edits, review |
| Phone | < 768px | View-only + quick actions | Run routines, review assignments |

### Tablet UX (1024px+)

Coaches working from gym floors use iPads. The builder MUST work on 1024px landscape.

**Key adaptations:**
- Library panel: 240px fixed width, always visible
- Builder canvas: remaining width
- Properties: bottom sheet on item tap (no persistent right panel)
- Drag-and-drop: works via touch sensors. dnd-kit's `TouchSensor` with `activationConstraint: { delay: 150, tolerance: 5 }` prevents scroll-vs-drag confusion
- "+" button fallback: prominently placed for coaches who find touch drag imprecise

### Phone UX (< 768px)

Phones are for consumption, not creation:
- **View assigned routines** — the B2C client experience
- **Run a routine** — step-by-step guided view with timer
- **Quick review** — browse cubes/routines, view details
- **No builder canvas** — the "Create" button links to "Open on desktop/tablet"

### Touch Sensor Configuration

```typescript
const touchSensor = useSensor(TouchSensor, {
  activationConstraint: {
    delay: 150,       // 150ms press before drag starts
    tolerance: 5,     // 5px movement tolerance during delay
  },
});
const pointerSensor = useSensor(PointerSensor, {
  activationConstraint: { distance: 5 },
});
const keyboardSensor = useSensor(KeyboardSensor, {
  coordinateGetter: sortableKeyboardCoordinates,
});

const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);
```

---

## 9. Performance Strategy

### Problem Areas

1. **Repository panels loading 100 items at once** — no pagination, no virtualization
2. **All builder items rendered in DOM** — no windowing for large routines
3. **Routine detail fetched per-add** — N+1 API calls when loading a super-routine with 10 routines

### Solutions

#### Repository Panels: Virtualized Infinite Scroll

Replace `ScrollArea` with `@tanstack/react-virtual`:

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['cubes', filters],
  queryFn: ({ pageParam = 1 }) => cubesApi.list({ ...filters, page: pageParam, page_size: 20 }),
  getNextPageParam: (last, pages) => last.total > pages.length * 20 ? pages.length + 1 : undefined,
});
```

With virtualization, only ~15 items render at a time regardless of total count. This supports 10,000+ cubes with no DOM bloat.

#### Builder Canvas: Windowing Unnecessary

A routine rarely exceeds 30 cubes. A super-routine rarely exceeds 10 routines. At these counts, full DOM rendering is fine. If edge cases arise (100+ items), add windowing later.

#### API Batching

For super-routine loading, batch routine detail fetches:

```typescript
// Current: N sequential fetches
for (const r of routines) {
  await routinesApi.get(r.id);  // N round-trips
}

// v2: Single batch endpoint
const details = await routinesApi.getBatch(routineIds);  // 1 round-trip
```

Add `GET /api/v1/routines/batch?ids=a,b,c` to the backend.

#### Image/Media Lazy Loading

Cube cards with YouTube thumbnails should use `loading="lazy"` on `<img>` tags (already partially done). For the detail panel, media should load only when the panel is opened.

#### Search Debouncing

Repository search currently fires on every keystroke. Add 300ms debounce:

```typescript
const debouncedSearch = useDebouncedValue(search, 300);
```

---

## 10. Technology Choices

### Drag-and-Drop: Keep dnd-kit

**Decision: Keep `@dnd-kit/core` + `@dnd-kit/sortable`.**

The current codebase already uses dnd-kit v6 effectively. Alternatives considered:

| Library | Verdict | Why |
|---------|---------|-----|
| `@dnd-kit` (current) | **Keep** | Best React DnD library. Supports nested sortables, multiple sensors, custom collision detection. Active maintenance. |
| `react-beautiful-dnd` | No | Deprecated by Atlassian. |
| `@hello-pangea/dnd` | No | Fork of rbd. Good but less flexible than dnd-kit for nested contexts. |
| `pragmatic-drag-and-drop` | Maybe v3 | Atlassian's new library. Lightweight but less mature for complex nested scenarios. |

**Additions needed:**
- `KeyboardSensor` + `sortableKeyboardCoordinates` for a11y
- `TouchSensor` for tablet support
- Custom `DragOverlay` per item type (cube vs routine)

### State Management: Zustand

**Decision: Zustand with `temporal` middleware for undo/redo.**

Why not keep React state:
- 931 lines of `useState` + callback hell proves it does not scale
- No undo/redo possible without external history tracking
- Prop drilling through 6+ levels creates coupling

Why Zustand over alternatives:
- Lighter than Redux Toolkit for this scope
- Built-in middleware for persistence (`persist`) and undo (`temporal`)
- Works with React 19 / Next.js 16 without issues
- No provider wrapping needed (unlike Context)

### Data Fetching: TanStack Query (already installed)

The codebase has `@tanstack/react-query` installed but barely uses it (only in Providers setup). v2 should use it for all API calls:
- Repository panels: `useInfiniteQuery` with virtualization
- Entity details: `useQuery` with cache
- Mutations: `useMutation` with optimistic updates for save/toggle

### UI Components: shadcn/ui (keep)

Already using shadcn components (Dialog, Sheet, Badge, Button, etc.). Keep and extend. The component set is solid.

### Accessibility

Add:
- `KeyboardSensor` for DnD
- `aria-live` region for builder status changes ("Item added", "Item removed")
- `role="list"` / `role="listitem"` for builder items
- Focus management: after adding an item, focus moves to the new item
- `role="group"` for phase zones with `aria-label`
- Skip navigation link for the builder
- High contrast mode support (ensure phase colors work in forced-colors)

---

## 11. Estimated Porting Effort

### Lines of Code

| Category | Current Lines | v2 Estimate | Action |
|----------|--------------|-------------|--------|
| Builder Canvas | 533 | ~600 | Refactor (add phases, a11y) |
| Repository Panel | 367 | ~300 | Refactor (extract hook, virtualize) |
| Detail Drawer | 468 | ~470 | Port (API changes only) |
| Save Dialog | 512 | ~550 | Refactor (add template save, phase metadata) |
| Mode Transition | 44 | ~44 | Port |
| Page orchestrator | 931 | ~200 | Rewrite (Zustand replaces state) |
| Builder store | 0 | ~350 | New |
| Builder history | 0 | ~80 | New |
| DnD hook | 0 | ~150 | New (extracted from page.tsx) |
| Repository hook | 0 | ~100 | New (extracted from panel) |
| Phase components | 0 | ~200 | New |
| Template browser | 0 | ~250 | New |
| CRUD form pages (4) | 1,397 | 0 | Deleted (replaced by builder) |
| Auth hook | 119 | ~80 | Rewrite (cookie SSO) |
| API client | 112 | ~60 | Rewrite (cookie auth) |
| API modules (5) | ~170 | ~170 | Port |
| Types | ~230 | ~280 | Port + extend |
| Cypress tests | ~140 | ~200 | Refactor selectors + auth |
| **Total** | **~5,023** | **~4,084** | |

**Net result:** ~940 fewer lines despite adding undo/redo, phases, templates, and better architecture. This comes from eliminating the 4 duplicated CRUD pages and replacing the 931-line orchestrator with a 200-line page + 580 lines of extracted hooks/store.

### Effort Estimate

| Phase | Work | Duration |
|-------|------|----------|
| 1. Foundation | Zustand store, auth rewrite, API client migration | 3-4 days |
| 2. Builder core | Canvas refactor, DnD hook extraction, phase zones | 4-5 days |
| 3. Library panel | Virtualization, TanStack Query, infinite scroll | 2-3 days |
| 4. Save pipeline | Refactored save dialog, template save-as, draft persistence | 2-3 days |
| 5. Properties panel | New right panel replacing detail drawer on desktop | 2 days |
| 6. Template system | Template browser, template loading, template publishing | 3-4 days |
| 7. Undo/redo | Zustand temporal integration, keyboard shortcuts | 1-2 days |
| 8. Tablet/mobile | Touch sensor, responsive layouts, bottom sheets | 2-3 days |
| 9. Accessibility | Keyboard DnD, ARIA, focus management | 2-3 days |
| 10. Testing | Cypress migration, new test scenarios | 2-3 days |
| **Total** | | **23-30 days** |

### What Can Be Directly Reused

These can be lifted with minimal changes:
- All `lib/types/*.ts` interfaces (port as-is)
- All `lib/api/*.ts` modules (swap client import)
- `CubePickerPopover` component (port)
- `ModeTransitionDialog` (port)
- `DraggableCard` pattern from RepositoryPanel (refactor into own file)
- `SortableItem` and `SortableCubeItem` patterns (refactor)
- `RoutineContainer` nested sortable pattern (refactor)
- `detectModifiedRoutines` save logic (port into store)
- `recalcRoutineDuration` helper (port)
- All shadcn/ui components (port)
- Loading skeleton components (port)
- Cypress test structure and helpers (refactor selectors)

---

## Appendix: Preview Mode Design

### Coach Preview

A "Preview" button in the builder toolbar opens a modal showing the routine as a client would see it:

```
+-------------------------------------------+
|  Preview: Morning HIIT Session            |
|                                           |
|  Duration: 45 min  |  10 exercises        |
|  Difficulty: Intermediate                 |
|                                           |
|  WARM-UP (8 min)                          |
|  1. Dynamic Stretching     5 min    [>]  |
|  2. Jump Rope              3 min    [>]  |
|                                           |
|  MAIN (30 min)                            |
|  3. Burpees                5 min    [>]  |
|  4. Box Jumps              5 min    [>]  |
|  ...                                     |
|                                           |
|  COOLDOWN (7 min)                         |
|  9. Static Stretching      4 min    [>]  |
|  10. Breathing Exercise    3 min    [>]  |
|                                           |
|  [Close Preview]  [Share Link]            |
+-------------------------------------------+
```

The `[>]` button expands each cube to show its exercise list, instructions, and media (YouTube thumbnails). This matches the B2C client view.

### Auto-Save vs Explicit Save

**Decision: Explicit save with draft auto-persistence.**

- Builder state auto-saves to `localStorage` every 2 seconds (debounced)
- This is a "draft" — not saved to the server
- The coach must click "Save" to persist to the backend
- On page load with an existing draft: "You have unsaved work. Resume or discard?"
- After explicit save: draft is cleared

This matches the mental model of creative tools (Figma auto-saves to cloud, but Cubes+ coaches expect a deliberate save action for something that affects their clients' training programs).
