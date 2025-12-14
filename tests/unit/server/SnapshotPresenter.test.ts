import { describe, expect, it } from 'vitest'

import { Todo } from '@core/domain/Todo'
import { Relationship } from '@core/domain/Relationship'
import type { BoardSnapshot } from '@core/usecases/GetBoardSnapshot'

import { SnapshotPresenter } from '../../../src/server/presenters/SnapshotPresenter'

const buildSnapshot = (): BoardSnapshot => ({
  tasks: [
    Todo.create({
      id: 'todo-1',
      title: 'Connect UI',
      color: '#0ea5e9',
      icon: '🧠',
    }),
  ],
  relationships: [
    Relationship.create({
      id: 'rel-1',
      fromId: 'todo-1',
      toId: 'todo-2',
      type: 'depends_on',
    }),
  ],
  totals: {
    count: 1,
    statuses: { pending: 1, in_progress: 0, completed: 0 },
    priorities: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 },
  },
  bounds: {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    width: 0,
    height: 0,
    center: { x: 0, y: 0 },
  },
  viewport: {
    width: 480,
    height: 480,
    padding: 240,
    x: { min: -240, max: 240 },
    y: { min: -240, max: 240 },
  },
})

describe('SnapshotPresenter', () => {
  it('serializes board snapshot into DTO', () => {
    const presenter = new SnapshotPresenter()
    const snapshot = buildSnapshot()

    const dto = presenter.present(snapshot)

    expect(dto.tasks[0]).toMatchObject({
      id: 'todo-1',
      visualSize: 'medium',
      position: { x: 0, y: 0 },
    })
    expect(dto.relationships[0].color).toBe('#0ea5e9')
    expect(dto.viewport.width).toBeGreaterThan(0)
  })
})
