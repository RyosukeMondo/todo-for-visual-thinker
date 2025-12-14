import { describe, expect, it } from 'vitest'

import type {
  TaskBoardRelationship,
  TaskBoardTask,
} from '@/web/components'
import { buildTaskHierarchy } from '@/web/utils/taskHierarchy'

let nextId = 0

const createTask = (id: string, overrides: Partial<TaskBoardTask> = {}): TaskBoardTask => ({
  id: id ?? `task-${nextId++}`,
  title: overrides.title ?? `Task ${id}`,
  description: overrides.description,
  status: overrides.status ?? 'pending',
  priority: overrides.priority ?? 3,
  color: overrides.color ?? '#60a5fa',
  position: overrides.position ?? { x: 0, y: 0 },
  category: overrides.category,
  icon: overrides.icon,
})

const relationship = (
  id: string,
  fromId: string,
  toId: string,
): TaskBoardRelationship => ({
  id,
  fromId,
  toId,
  type: 'parent_of',
})

describe('buildTaskHierarchy', () => {
  it('nests tasks based on parent_of relationships', () => {
    const tasks = [
      createTask('epic', { priority: 5 }),
      createTask('story'),
      createTask('sub-task'),
    ]
    const relationships: TaskBoardRelationship[] = [
      relationship('rel-1', 'epic', 'story'),
      relationship('rel-2', 'story', 'sub-task'),
    ]

    const hierarchy = buildTaskHierarchy(tasks, relationships)

    expect(hierarchy).toHaveLength(1)
    expect(hierarchy[0].id).toBe('epic')
    expect(hierarchy[0].children).toHaveLength(1)
    expect(hierarchy[0].children[0].id).toBe('story')
    expect(hierarchy[0].children[0].children[0].id).toBe('sub-task')
  })

  it('guards against circular relationships by keeping nodes as roots', () => {
    const tasks = [createTask('alpha'), createTask('beta')]
    const relationships: TaskBoardRelationship[] = [
      relationship('rel-1', 'alpha', 'beta'),
      relationship('rel-2', 'beta', 'alpha'), // ignored to avoid cycle
    ]

    const hierarchy = buildTaskHierarchy(tasks, relationships)

    expect(hierarchy).toHaveLength(1)
    expect(hierarchy[0].id).toBe('alpha')
    expect(hierarchy[0].children.map((node) => node.id)).toEqual(['beta'])
  })
})
