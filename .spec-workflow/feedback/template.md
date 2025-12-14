# Feedback Template

Copy this template when posting feedback to `pending.md`:

```markdown
## [Title: Brief description]
**Date:** YYYY-MM-DD
**Priority:** LOW | MEDIUM | HIGH | CRITICAL
**Type:** BUG | FEATURE | IMPROVEMENT | QUESTION | VISUAL

**Description:**
Clear description of what you observed or want to request.

**Expected Behavior:**
What should happen instead.

**Steps to Reproduce (if applicable):**
1. Step one
2. Step two
3. Observed result

**Visual Requirements (if applicable):**
- What should the user see?
- What visual feedback is expected?
- How should it look/feel?

**Additional Context:**
- Screenshots, links, references
- Related issues or features
- Any other helpful information

**Verification Steps:**
How to verify this is fixed/implemented:
1. Do X
2. Check Y
3. Expected result Z
```

## Examples

### Bug Report Example
```markdown
## Web UI doesn't display database todos
**Date:** 2025-12-14
**Priority:** CRITICAL
**Type:** BUG

**Description:**
The web UI only shows hardcoded sample todos. Todos created via CLI are not visible on the canvas.

**Expected Behavior:**
Web UI should load and display todos from the SQLite database.

**Steps to Reproduce:**
1. Run: `pnpm cli add "Test task" --color "#60a5fa"`
2. Open http://localhost:5173/
3. Expected: See "Test task" on canvas
4. Actual: Only see hardcoded sample data

**Verification Steps:**
1. Add todo via CLI
2. Refresh web UI
3. Should see the new todo on the canvas
```

### Feature Request Example
```markdown
## Add zoom controls to canvas
**Date:** 2025-12-14
**Priority:** MEDIUM
**Type:** FEATURE | VISUAL

**Description:**
Canvas needs zoom in/out controls for better navigation of large todo spaces.

**Expected Behavior:**
- Mouse wheel zooms canvas in/out
- Zoom controls visible in UI
- Zoom level indicator shown
- Smooth zoom animation

**Visual Requirements:**
- Zoom buttons (+/-) in corner of canvas
- Or floating toolbar with zoom slider
- Zoom percentage displayed (50%, 100%, 200%)
- Smooth transitions when zooming

**Verification Steps:**
1. Open web UI
2. Scroll mouse wheel over canvas
3. Canvas should zoom in/out smoothly
4. Zoom level should be indicated visually
```

### Visual Improvement Example
```markdown
## Priority indicators not visually distinct
**Date:** 2025-12-14
**Priority:** LOW
**Type:** IMPROVEMENT | VISUAL

**Description:**
All todo cards look the same size regardless of priority. Hard to identify high-priority tasks at a glance.

**Expected Behavior:**
Higher priority tasks should be more visually prominent:
- P5 (highest): Larger card, stronger shadow
- P4: Slightly larger
- P3: Normal size
- P2: Slightly smaller
- P1: Smallest

**Visual Requirements:**
- Card size scales with priority
- Shadow intensity increases with priority
- Should feel natural, not overwhelming
- Color still primary visual cue

**Verification Steps:**
1. Create todos with different priorities
2. View on canvas
3. Should immediately see which tasks are high priority
4. Visual hierarchy should feel intuitive
```
