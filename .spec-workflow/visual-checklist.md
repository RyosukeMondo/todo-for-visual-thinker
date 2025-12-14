# Visual Feature Checklist

This checklist defines visual features that require human verification but should be implemented by the AI agent.

## Status Legend
- [ ] Not implemented
- [~] Partially implemented (needs review)
- [x] Implemented and verified

---

## Core Visual Features

### Infinite Canvas View
- [ ] **Todo cards displayed on 2D canvas**
  - Visual representation: Cards positioned at x,y coordinates
  - Expected: Grid-like layout with spatial relationships visible
  - How to verify: Open web UI, should see cards spread across canvas

- [ ] **Zoom controls**
  - Visual representation: Zoom in/out buttons or mouse wheel zoom
  - Expected: Canvas scales smoothly
  - How to verify: Mouse wheel should zoom canvas

- [ ] **Pan/drag canvas**
  - Visual representation: Click and drag background to pan
  - Expected: Smooth dragging of entire canvas
  - How to verify: Click empty space and drag

### Task Cards

- [ ] **Color-coded cards**
  - Visual representation: Each card shows its assigned color as background/border
  - Expected: Visually distinct colors make tasks easy to identify
  - How to verify: Cards should have different colors based on their `color` property

- [ ] **Icon display**
  - Visual representation: Emoji/icon shown prominently on each card
  - Expected: Icons provide visual anchors for memory
  - How to verify: Each card shows its icon (🎨, 🧭, 🛰️, etc.)

- [ ] **Priority visual indicators**
  - Visual representation: Size, shadow, or visual weight changes by priority
  - Expected: P5 (highest) cards are larger/more prominent than P1
  - How to verify: Higher priority cards visually stand out

### Relationships & Connections

- [ ] **Relationship lines between cards**
  - Visual representation: Lines connecting related tasks
  - Expected: Visual links show dependencies (blocks, relates_to, etc.)
  - How to verify: Create relationship via CLI, see line in web UI

- [ ] **Connection labels**
  - Visual representation: Line labels showing relationship type
  - Expected: "blocks", "child of", etc. visible on lines
  - How to verify: Hover over connection line shows type

### Interactive Features

- [ ] **Drag & drop cards**
  - Visual representation: Click and drag individual cards to reposition
  - Expected: Card position updates and persists
  - How to verify: Drag card, refresh page, position preserved

- [ ] **Click to select/focus**
  - Visual representation: Clicking card highlights/selects it
  - Expected: Selected card has visual distinction (border, shadow, etc.)
  - How to verify: Click card, it becomes visually selected

- [ ] **Keyboard navigation**
  - Visual representation: Arrow keys move selection between cards
  - Expected: Can navigate spatially using keyboard
  - How to verify: Press arrow keys, selection moves to adjacent cards

### Filters & Views

- [ ] **Status filter visualization**
  - Visual representation: Filter chips/buttons showing active filters
  - Expected: Clear visual indication of what's being filtered
  - How to verify: Status filter UI shows which statuses are visible

- [ ] **Category filter**
  - Visual representation: Category tags/buttons for filtering
  - Expected: Can toggle categories on/off visually
  - How to verify: Category filter toggles visibility of cards

---

## Visual Quality Criteria

These are subjective but important for visual thinkers:

### Cognitive Load Reduction
- Colors should be distinct but not overwhelming
- Icons should be immediately recognizable
- Spatial layout should feel intuitive
- Related items should be visually grouped

### Accessibility
- Color contrast meets WCAG AA standards
- UI works without color (icons, labels)
- Keyboard navigation fully supported
- Screen reader compatible

### Performance
- Canvas renders smoothly with 50+ cards
- Zoom/pan feels responsive (60fps)
- Drag and drop has no lag

---

## Current Issues (Human Feedback)

### Missing: Todo List Display on Web UI
**Date:** 2025-12-14
**Status:** Critical
**Description:**
The web UI shows the AddTodoForm but doesn't display the list of existing todos. Only shows sample data, not actual todos from the database.

**Expected Behavior:**
1. Web UI should load todos from the database (via API or shared repository)
2. Todos should be displayed as cards on the canvas
3. Cards should be positioned according to their `position` property
4. Should see actual todos created via CLI, not just hardcoded samples

**How to Verify:**
```bash
# 1. Add a todo via CLI
pnpm cli add "Test visual todo" --color "#60a5fa" --icon "🔵"

# 2. Open web UI at http://localhost:5173/

# 3. Expected: See "Test visual todo" card on canvas
# 4. Actual: Only see hardcoded sample todos
```

**Priority:** HIGH - Core functionality missing

---

## Notes for AI Agent

When implementing visual features:
1. **Check this list** each iteration to see what's pending
2. **Self-verify** by describing what the user would see
3. **Mark items [~]** when implemented but not verified by human
4. **Document** in commit message which visual features were added
5. **Consider feedback** in "Current Issues" section above

Visual features are harder to test automatically, so:
- Describe the expected visual outcome in code comments
- Add TODO comments for human verification
- Include screenshots in commit messages if possible
- Tag commits with `visual:` prefix for visual features
