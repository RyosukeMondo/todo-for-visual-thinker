import { beforeEach, describe, expect, it } from 'vitest'

import { Todo } from '@/core/domain/Todo'
import type { TodoRepository } from '@/core/ports'
import type { ListTodosQuery } from '@/core/ports/TodoRepository'
import { GetBoardStatus } from '@/core/usecases/GetBoardStatus'

class RecordingRepository implements TodoRepository {
  public readonly calls: ListTodosQuery[] = []

  constructor(private readonly seed: readonly Todo[]) {}

  async list(query: ListTodosQuery = {}): Promise<Todo[]> {
    this.calls.push(query)
    const start = query.offset ?? 0
    const end = query.limit ? start + query.limit : this.seed.length
    return this.seed
      .slice(start, end)
      .map((todo) => Todo.restore(todo.toJSON()))
  }

  async save(): Promise<void> {
    throw new Error('Not implemented')
  }

  async findById(): Promise<Todo | null> {
    return null
  }

  async delete(): Promise<void> {
    throw new Error('Not implemented')
  }

  async deleteMany(): Promise<void> {
    throw new Error('Not implemented')
  }
}

const buildTodo = (overrides: Partial<Parameters<typeof Todo.create>[0]> = {}) =>
  Todo.create({
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Canvas mapping',
    description: overrides.description,
    status: overrides.status,
    priority: overrides.priority,
    category: overrides.category,
    color: overrides.color ?? '#60a5fa',
    position: overrides.position ?? { x: 0, y: 0 },
    createdAt: overrides.createdAt,
  })

const buildSeedData = (): Todo[] => [
  buildTodo({
    id: 'todo-1',
    status: 'pending',
    priority: 2,
    category: 'Strategy',
    color: '#f97316',
    createdAt: new Date('2024-02-01T10:00:00Z'),
  }),
  buildTodo({
    id: 'todo-2',
    status: 'in_progress',
    priority: 5,
    category: 'strategy',
    color: '#f97316',
    createdAt: new Date('2024-02-03T10:00:00Z'),
  }),
  buildTodo({
    id: 'todo-3',
    status: 'completed',
    priority: 4,
    category: 'Design',
    color: '#60a5fa',
    createdAt: new Date('2024-02-05T10:00:00Z'),
  }),
]

describe('GetBoardStatus use case', () => {
  let repository: RecordingRepository

  beforeEach(() => {
    repository = new RecordingRepository(buildSeedData())
  })

  it('aggregates snapshot metrics across statuses, priorities, and categories', async () => {
    const useCase = new GetBoardStatus({ repository })

    const snapshot = await useCase.execute()

    expect(snapshot.total).toBe(3)
    expect(snapshot.active).toBe(2)
    expect(snapshot.completed).toBe(1)
    expect(snapshot.statuses).toEqual({
      pending: 1,
      in_progress: 1,
      completed: 1,
    })
    expect(snapshot.priorities[5]).toBe(1)
    expect(snapshot.priorities[2]).toBe(1)
    expect(snapshot.categories).toEqual([
      { label: 'Strategy', value: 'strategy', color: '#f97316', count: 2 },
      { label: 'Design', value: 'design', color: '#60a5fa', count: 1 },
    ])
    expect(snapshot.lastCreatedAt?.toISOString()).toBe('2024-02-05T10:00:00.000Z')
  })

  it('streams todos in batches and tracks latest timestamps', async () => {
    const useCase = new GetBoardStatus({ repository, batchSize: 2 })

    const snapshot = await useCase.execute()

    expect(repository.calls).toEqual([
      { limit: 2, offset: 0 },
      { limit: 2, offset: 2 },
    ])
    expect(snapshot.lastUpdatedAt).toBeInstanceOf(Date)
    expect(snapshot.completionRate).toBeCloseTo(1 / 3)
  })
})
