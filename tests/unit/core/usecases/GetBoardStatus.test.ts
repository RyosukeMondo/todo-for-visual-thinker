import { beforeEach, describe, expect, it } from 'vitest'

import { Relationship } from '@/core/domain/Relationship'
import { Todo } from '@/core/domain/Todo'
import type { TodoRepository } from '@/core/ports'
import type { ListTodosQuery } from '@/core/ports/TodoRepository'
import type {
  RelationshipQuery,
  RelationshipRepository,
} from '@/core/ports/RelationshipRepository'
import { GetBoardStatus } from '@/core/usecases/GetBoardStatus'

class RecordingTodoRepository implements TodoRepository {
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

class RecordingRelationshipRepository implements RelationshipRepository {
  public readonly calls: RelationshipQuery[] = []

  constructor(private readonly seed: readonly Relationship[]) {}

  async list(query: RelationshipQuery = {}): Promise<Relationship[]> {
    this.calls.push(query)
    const start = query.offset ?? 0
    const end = query.limit ? start + query.limit : this.seed.length
    return this.seed
      .slice(start, end)
      .map((relationship) => Relationship.restore(relationship.toJSON()))
  }

  async save(): Promise<void> {
    throw new Error('Not implemented')
  }

  async findById(): Promise<Relationship | null> {
    return null
  }

  async findBetween(): Promise<Relationship | null> {
    return null
  }

  async delete(): Promise<void> {
    throw new Error('Not implemented')
  }

  async deleteByTodoId(): Promise<void> {
    throw new Error('Not implemented')
  }

  async listByTodoIds(): Promise<Relationship[]> {
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

const buildTodoSeed = (): Todo[] => [
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
  let repository: RecordingTodoRepository
  let relationships: RecordingRelationshipRepository

  beforeEach(() => {
    repository = new RecordingTodoRepository(buildTodoSeed())
    relationships = new RecordingRelationshipRepository(buildRelationshipSeed())
  })

  it('aggregates snapshot metrics across statuses, priorities, categories, and dependencies', async () => {
    const snapshot = await createUseCase().execute()

    expectCoreCounts(snapshot)
    expect(snapshot.categories).toEqual([
      { label: 'Strategy', value: 'strategy', color: '#f97316', count: 2 },
      { label: 'Design', value: 'design', color: '#60a5fa', count: 1 },
    ])
    expect(snapshot.lastCreatedAt?.toISOString()).toBe('2024-02-05T10:00:00.000Z')
    expect(snapshot.dependencies).toEqual(
      expect.objectContaining({
        total: 4,
        byType: { depends_on: 2, blocks: 1, related_to: 0, parent_of: 1 },
        dependentTasks: 2,
        blockingTasks: 1,
        blockedTasks: 1,
        brokenCount: 1,
      }),
    )
    expect(snapshot.dependencies.brokenRelationships[0]).toEqual({
      id: 'rel-3',
      missingEndpoint: 'source',
      missingTaskId: 'ghost',
      type: 'depends_on',
    })
  })

  it('streams todos and relationships in batches', async () => {
    const snapshot = await createUseCase({ batchSize: 2 }).execute()

    expect(repository.calls).toEqual([
      { limit: 2, offset: 0 },
      { limit: 2, offset: 2 },
    ])
    expect(relationships.calls).toEqual([
      { limit: 2, offset: 0 },
      { limit: 2, offset: 2 },
      { limit: 2, offset: 4 },
    ])
    expect(snapshot.lastUpdatedAt).toBeInstanceOf(Date)
    expect(snapshot.completionRate).toBeCloseTo(1 / 3)
  })

  const createUseCase = (overrides: Partial<{ batchSize: number }> = {}) =>
    new GetBoardStatus({
      repository,
      relationships,
      batchSize: overrides.batchSize,
    })

  const expectCoreCounts = (snapshot: Awaited<ReturnType<GetBoardStatus['execute']>>) => {
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
  }
})

const buildRelationshipSeed = (): Relationship[] => [
  Relationship.create({
    id: 'rel-1',
    fromId: 'todo-2',
    toId: 'todo-1',
    type: 'depends_on',
    createdAt: new Date('2024-02-03T10:05:00Z'),
  }),
  Relationship.create({
    id: 'rel-2',
    fromId: 'todo-3',
    toId: 'todo-2',
    type: 'blocks',
    createdAt: new Date('2024-02-05T10:05:00Z'),
  }),
  Relationship.create({
    id: 'rel-3',
    fromId: 'ghost',
    toId: 'todo-1',
    type: 'depends_on',
    createdAt: new Date('2024-02-06T10:05:00Z'),
  }),
  Relationship.create({
    id: 'rel-4',
    fromId: 'todo-1',
    toId: 'todo-3',
    type: 'parent_of',
    createdAt: new Date('2024-02-07T10:05:00Z'),
  }),
]
