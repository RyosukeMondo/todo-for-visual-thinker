import { describe, expect, it } from 'vitest'

import { Todo } from '@core/domain/Todo'
import { planSpiralPosition } from '@/server/placement/SpiralPositionPlanner'

const buildExisting = (count: number): Todo[] =>
  Array.from({ length: count }, (_, index) =>
    Todo.create({ id: `todo-${index}`, title: `Seed ${index}`, color: '#a855f7' }),
  )

describe('planSpiralPosition', () => {
  it('returns origin when there are no existing todos', () => {
    const position = planSpiralPosition([])
    expect(position).toEqual({ x: 0, y: 0 })
  })

  it('produces bounded spiral coordinates for later todos', () => {
    const existing = buildExisting(12)
    const position = planSpiralPosition(existing)

    expect(Math.abs(position.x)).toBeLessThanOrEqual(5000)
    expect(Math.abs(position.y)).toBeLessThanOrEqual(5000)
    expect(Math.abs(position.x) + Math.abs(position.y)).toBeGreaterThan(0)
  })
})
