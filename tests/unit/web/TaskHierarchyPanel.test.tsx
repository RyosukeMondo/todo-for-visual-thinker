import { fireEvent, render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

import { TaskHierarchyPanel } from '@/web/components/TaskHierarchyPanel'
import type {
  TaskBoardRelationship,
  TaskBoardTask,
} from '@/web/components'

let counter = 0
const createTask = (overrides: Partial<TaskBoardTask> = {}): TaskBoardTask => ({
  id: overrides.id ?? `task-${counter++}`,
  title: overrides.title ?? 'Task',
  status: overrides.status ?? 'pending',
  priority: overrides.priority ?? 3,
  color: overrides.color ?? '#60a5fa',
  category: overrides.category,
  icon: overrides.icon,
  description: overrides.description,
  position: overrides.position ?? { x: 0, y: 0 },
})

const parentRelationship = (
  fromId: string,
  toId: string,
): TaskBoardRelationship => ({
  id: `${fromId}-${toId}`,
  fromId,
  toId,
  type: 'parent_of',
})

describe('TaskHierarchyPanel', () => {
  it('renders nested hierarchy rows with indentation', () => {
    const parent = createTask({ id: 'parent', title: 'Parent' })
    const child = createTask({ id: 'child', title: 'Child', icon: '✨' })
    const { getByText } = render(
      <TaskHierarchyPanel
        tasks={[parent, child]}
        relationships={[parentRelationship('parent', 'child')]}
      />,
    )

    const childButton = getByText('Child').closest('button')
    expect(childButton).toBeTruthy()
    expect(childButton?.style.marginLeft).toBe('18px')
  })

  it('invokes onSelectTask when a row is clicked', () => {
    const parent = createTask({ id: 'parent', title: 'Parent' })
    const child = createTask({ id: 'child', title: 'Child' })
    const handleSelect = vi.fn()
    const { getByText } = render(
      <TaskHierarchyPanel
        tasks={[parent, child]}
        relationships={[parentRelationship('parent', 'child')]}
        onSelectTask={handleSelect}
      />,
    )

    fireEvent.click(getByText('Child'))

    expect(handleSelect).toHaveBeenCalledWith('child')
  })

  it('shows empty state when there are no tasks', () => {
    const { getByText } = render(
      <TaskHierarchyPanel tasks={[]} relationships={[]} />,
    )

    expect(getByText(/seed a few todos/i)).toBeVisible()
  })
})
