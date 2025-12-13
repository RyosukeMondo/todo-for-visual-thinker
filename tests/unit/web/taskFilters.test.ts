import { describe, expect, it } from 'vitest'

import type { TaskBoardTask } from '@/web/components'
import { applyTaskFilters, createFilterState, normalizeCategoryLabel } from '@/web/utils/taskFilters'

const sampleTasks: TaskBoardTask[] = [
  {
    id: 'a',
    title: 'Explore color theory',
    status: 'pending',
    priority: 2,
    color: '#06b6d4',
    category: 'Design',
    position: { x: 0, y: 0 },
  },
  {
    id: 'b',
    title: 'Craft canvas interactions',
    status: 'in_progress',
    priority: 4,
    color: '#f97316',
    category: 'Experience',
    position: { x: 100, y: 0 },
  },
  {
    id: 'c',
    title: 'Archive learnings',
    status: 'completed',
    priority: 1,
    color: '#22c55e',
    category: 'Documentation',
    position: { x: -120, y: 60 },
  },
]

describe('taskFilters utils', () => {
  it('creates independent filter state sets', () => {
    const filters = createFilterState({
      statuses: ['pending', 'completed'],
      categories: ['design'],
    })

    expect(filters.statuses).toBeInstanceOf(Set)
    expect(filters.categories).toBeInstanceOf(Set)
    expect(filters.statuses.has('pending')).toBe(true)
    expect(filters.categories.has('design')).toBe(true)
  })

  it('normalizes category labels consistently', () => {
    expect(normalizeCategoryLabel('Design ')).toBe('design')
    expect(normalizeCategoryLabel('  ')).toBe('uncategorized')
    expect(normalizeCategoryLabel(undefined)).toBe('uncategorized')
  })

  it('applies combined status and category filters', () => {
    const filters = createFilterState({
      statuses: ['pending', 'completed'],
      categories: ['design'],
    })

    const filtered = applyTaskFilters(sampleTasks, filters)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('a')
  })

  it('falls back to status filtering when no categories selected', () => {
    const filters = createFilterState({ statuses: ['completed'] })
    const filtered = applyTaskFilters(sampleTasks, filters)

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.status).toBe('completed')
  })
})
