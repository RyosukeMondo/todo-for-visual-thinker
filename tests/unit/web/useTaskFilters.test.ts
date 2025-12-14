import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { TaskBoardRelationship, TaskBoardTask } from '@/web/components'
import type { TodoStatus } from '@core/domain/Todo'
import { useTaskFilters } from '@/web/hooks/useTaskFilters'

const tasks: TaskBoardTask[] = [
  {
    id: 'todo-1',
    title: 'Launch visual identity',
    status: 'pending',
    priority: 3,
    color: '#f43f5e',
    category: 'Brand',
    position: { x: 0, y: 0 },
  },
  {
    id: 'todo-2',
    title: 'Prototype panning physics',
    status: 'in_progress',
    priority: 4,
    color: '#38bdf8',
    category: 'Experience',
    position: { x: 120, y: 160 },
  },
  {
    id: 'todo-3',
    title: 'Archive finished experiments',
    status: 'completed',
    priority: 2,
    color: '#34d399',
    category: 'Documentation',
    position: { x: -40, y: -80 },
  },
]

const relationships: TaskBoardRelationship[] = [
  { id: 'rel-1', fromId: 'todo-1', toId: 'todo-2', type: 'depends_on' },
  { id: 'rel-2', fromId: 'todo-2', toId: 'todo-3', type: 'blocks' },
]

const INITIAL_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

describe('useTaskFilters', () => {
  it('initializes with all tasks and derived categories', () => {
    const { result } = renderHook(() =>
      useTaskFilters(tasks, INITIAL_STATUSES, relationships),
    )

    expect(result.current.filteredTasks).toHaveLength(3)
    expect(result.current.categories.map((category) => category.value)).toEqual([
      'brand',
      'documentation',
      'experience',
    ])
    expect(result.current.filteredRelationships).toHaveLength(2)
  })

  it('prevents disabling the last remaining status filter', () => {
    const { result } = renderHook(() =>
      useTaskFilters(tasks, ['pending' as TodoStatus], relationships),
    )

    act(() => result.current.toggleStatus('pending'))

    expect(result.current.filters.statuses.has('pending')).toBe(true)
  })

  it('toggles categories and filters tasks accordingly', () => {
    const { result } = renderHook(() =>
      useTaskFilters(tasks, INITIAL_STATUSES, relationships),
    )

    act(() => result.current.toggleCategory('brand'))
    expect(Array.from(result.current.filters.categories)).toEqual(['brand'])
    expect(result.current.filteredTasks).toHaveLength(1)
    expect(result.current.filteredTasks[0]?.id).toBe('todo-1')
    expect(result.current.filteredRelationships).toHaveLength(0)

    act(() => result.current.resetCategories())
    expect(result.current.filters.categories.size).toBe(0)
    expect(result.current.filteredTasks).toHaveLength(3)
    expect(result.current.filteredRelationships).toHaveLength(2)
  })

  it('omits relationships that reference filtered-out tasks', () => {
    const { result } = renderHook(() =>
      useTaskFilters(tasks, INITIAL_STATUSES, relationships),
    )

    act(() => result.current.toggleStatus('completed'))

    expect(result.current.filteredTasks.some((task) => task.status === 'completed')).toBe(
      false,
    )
    expect(result.current.filteredRelationships).toHaveLength(1)
    expect(result.current.filteredRelationships[0]?.id).toBe('rel-1')
  })
})
