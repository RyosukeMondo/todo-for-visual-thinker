import { describe, expect, it } from 'vitest'

import { BoardStatusPresenter } from '@/server/presenters/BoardStatusPresenter'
import type { BoardStatusSnapshot } from '@/core/usecases/GetBoardStatus'

describe('BoardStatusPresenter', () => {
  it('serializes board status snapshot into transport-safe DTO', () => {
    const presenter = new BoardStatusPresenter()
    const snapshot: BoardStatusSnapshot = {
      total: 4,
      active: 3,
      completed: 1,
      completionRate: 0.25,
      statuses: {
        pending: 1,
        in_progress: 2,
        completed: 1,
      },
      priorities: {
        1: 0,
        2: 0,
        3: 2,
        4: 1,
        5: 1,
      },
      categories: [
        {
          label: 'Research',
          value: 'research',
          count: 2,
          color: '#60a5fa',
        },
      ],
      lastUpdatedAt: new Date('2024-01-02T00:00:00Z'),
      lastCreatedAt: new Date('2024-01-01T16:00:00Z'),
      dependencies: {
        total: 3,
        byType: {
          depends_on: 2,
          blocks: 1,
          related_to: 0,
        },
        dependentTasks: 2,
        blockingTasks: 1,
        blockedTasks: 1,
        brokenCount: 1,
        brokenRelationships: [
          {
            id: 'rel-1',
            missingEndpoint: 'target',
            missingTaskId: 'missing-task',
            type: 'blocks',
          },
        ],
      },
    }

    const dto = presenter.present(snapshot)

    expect(dto.totals).toEqual(
      expect.objectContaining({
        total: 4,
        active: 3,
        completed: 1,
        completionRate: 0.25,
        lastUpdatedAt: '2024-01-02T00:00:00.000Z',
      }),
    )
    expect(dto.dependencies.total).toBe(3)
    expect(dto.dependencies.byType.blocks).toBe(1)
    expect(dto.dependencies.brokenRelationships).toHaveLength(1)
    expect(dto.categories[0]).toEqual(snapshot.categories[0])
  })
})
