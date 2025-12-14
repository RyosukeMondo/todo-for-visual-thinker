import { describe, expect, it } from 'vitest'

import { Todo } from '@/core/domain/Todo'
import type { TodoRepository } from '@/core/ports'
import type { ListTodosQuery } from '@/core/ports/TodoRepository'
import { GetBoardSnapshot } from '@/core/usecases/GetBoardSnapshot'

class FakeRepository implements TodoRepository {
  constructor(private readonly todos: readonly Todo[]) {}

  async list(_: ListTodosQuery = {}): Promise<Todo[]> {
    return this.todos.map((todo) => Todo.restore(todo.toJSON()))
  }

  async save(): Promise<void> {
    throw new Error('not implemented')
  }

  async findById(): Promise<Todo | null> {
    throw new Error('not implemented')
  }

  async delete(): Promise<void> {
    throw new Error('not implemented')
  }

  async deleteMany(): Promise<void> {
    throw new Error('not implemented')
  }
}

const buildTodo = (props: Partial<Parameters<typeof Todo.create>[0]> = {}) =>
  Todo.create({
    id: props.id ?? crypto.randomUUID(),
    title: props.title ?? 'Spatial experiment',
    status: props.status ?? 'pending',
    priority: props.priority ?? 3,
    category: props.category ?? 'Research',
    color: props.color ?? '#f97316',
    position: props.position ?? { x: 0, y: 0 },
    createdAt: props.createdAt,
  })

describe('GetBoardSnapshot', () => {
  it('returns totals, bounds, and viewport for clustered tasks', async () => {
    const tasks = [
      buildTodo({ id: 't-1', status: 'pending', priority: 4, position: { x: -120, y: 90 } }),
      buildTodo({ id: 't-2', status: 'completed', priority: 5, position: { x: 240, y: -30 } }),
      buildTodo({ id: 't-3', status: 'in_progress', priority: 2, position: { x: 40, y: 300 } }),
    ]
    const useCase = new GetBoardSnapshot({ repository: new FakeRepository(tasks), viewportPadding: 100 })

    const snapshot = await useCase.execute()

    expect(snapshot.tasks).toHaveLength(3)
    expect(snapshot.totals).toEqual({
      count: 3,
      statuses: {
        pending: 1,
        in_progress: 1,
        completed: 1,
      },
      priorities: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 1 },
    })
    expect(snapshot.bounds).toEqual({
      minX: -120,
      maxX: 240,
      minY: -30,
      maxY: 300,
      width: 360,
      height: 330,
      center: { x: 60, y: 135 },
    })
    expect(snapshot.viewport).toEqual({
      width: 560,
      height: 530,
      padding: 100,
      x: { min: -220, max: 340 },
      y: { min: -130, max: 400 },
    })
  })

  it('falls back to default viewport when no tasks exist', async () => {
    const useCase = new GetBoardSnapshot({ repository: new FakeRepository([]), minViewportSize: 400, viewportPadding: 80 })

    const snapshot = await useCase.execute()

    expect(snapshot.tasks).toEqual([])
    expect(snapshot.bounds.center).toEqual({ x: 0, y: 0 })
    expect(snapshot.viewport).toEqual({
      width: 400,
      height: 400,
      padding: 80,
      x: { min: -200, max: 200 },
      y: { min: -200, max: 200 },
    })
  })
})
