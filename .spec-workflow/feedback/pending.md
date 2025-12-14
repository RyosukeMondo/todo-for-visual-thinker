## Web UI doesn't display todos from database - only shows hardcoded sample data. Need to connect web UI to SQLite repository to load actual todos.
**Date:** 2025-12-14 10:21:09
**Priority:** CRITICAL
**Type:** BUG

**Description:**
Web UI doesn't display todos from database - only shows hardcoded sample data. Need to connect web UI to SQLite repository to load actual todos.

**⚡ IMPORTANT - Data-Driven Validation Strategy:**

DO NOT spend time on expensive visual validation! Validate the DATA, not the rendering.

**Fast validation approach:**
1. Check JSON data structure BEFORE rendering
2. Validate property types (x, y coordinates, colors, icons)
3. Test data transformations with unit tests
4. Assert computed values (priority → visual size)

**Example - Canvas drawing:**
```typescript
// ✅ FAST: Validate data (< 1ms)
expect(todo.position).toEqual({ x: 100, y: 200 })
expect(todo.color).toMatch(/^#[0-9a-f]{6}$/)
expect(todo.visualSize).toBe('large') // for priority 5

// ❌ SLOW: Don't validate pixels/rendering (100-500ms)
// Don't check actual canvas output
```

**Speed boost: 100-500x faster iteration!**

**How to verify this fix works:**
1. Validate: API endpoint returns correct JSON structure
2. Validate: Data has required properties (id, title, position, color, etc.)
3. Validate: Array of todos is not empty when database has data
4. Quick visual check: Open web UI, see if cards appear (human does this once)

**Status:** PENDING (awaiting AI agent processing)

**Posted by:** Human (async feedback)
