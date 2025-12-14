import { describe, expect, it } from 'vitest'

import type { BoardSnapshotDTO } from '@shared/types/board'

import { transformSnapshot } from '../../../src/web/utils/boardData'

const buildSnapshot = (overrides: Partial<BoardSnapshotDTO> = {}): BoardSnapshotDTO => ({
  tasks: [
    {
      id: 'todo-1',
      title: 'First',
      description: 'Details',
      status: 'pending',
      priority: 3,
      category: 'Focus',
      color: '#34d399',
      icon: '⭐️',
      position: { x: 10, y: 20 },
      visualSize: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: undefined,
    },
  ],
  relationships: [
    {
      id: 'rel-1',
      fromId: 'todo-1',
      toId: 'todo-2',
      type: 'depends_on',
      color: '#34d399',
    },
  ],
  totals: {
    count: 1,
    statuses: { pending: 1, in_progress: 0, completed: 0 },
    priorities: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 },
  },
  viewport: {
    width: 100,
    height: 100,
    padding: 10,
    x: { min: -50, max: 50 },
    y: { min: -50, max: 50 },
  },
  ...overrides,
})

describe('transformSnapshot', () => {
  it('maps domain snapshot into view model', () => {
    const dto = buildSnapshot()

    const result = transformSnapshot(dto)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]).toMatchObject({
      id: 'todo-1',
      title: 'First',
      status: 'pending',
      priority: 3,
      position: { x: 10, y: 20 },
      size: 'medium',
    })
    expect(result.relationships[0]).toMatchObject({
      id: 'rel-1',
      fromId: 'todo-1',
      color: '#34d399',
    })
  })

  it('falls back to default colors when invalid', () => {
    const dto = buildSnapshot({
      tasks: [
        {
          id: 'todo-1',
          title: 'Missing color',
          description: undefined,
          status: 'pending',
          priority: 2,
          category: undefined,
          color: 'invalid',
          icon: undefined,
          position: { x: 0, y: 0 },
          visualSize: 'small',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: undefined,
        },
      ],
      relationships: [],
    })

    const result = transformSnapshot(dto)

    expect(result.tasks[0].color).toBe('#6366f1')
  })
})
