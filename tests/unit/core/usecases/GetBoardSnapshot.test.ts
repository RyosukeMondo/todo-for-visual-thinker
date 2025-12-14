import { describe, expect, it } from 'vitest'

import { Todo } from '@/core/domain/Todo'
import type { TodoRepository } from '@/core/ports'
import type { ListTodosQuery } from '@/core/ports/TodoRepository'
import type { RelationshipRepository } from '@/core/ports/RelationshipRepository'
import { Relationship } from '@/core/domain/Relationship'
import { GetBoardSnapshot } from '@/core/usecases/GetBoardSnapshot'

class FakeTodoRepository implements TodoRepository {
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

class FakeRelationshipRepository implements Pick<RelationshipRepository, 'listByTodoIds'> {
  constructor(private readonly relationships: readonly Relationship[]) {}

  async listByTodoIds(todoIds: readonly string[]): Promise<Relationship[]> {
    const normalized = new Set(todoIds)
    return this.relationships.filter((relationship) =>
      normalized.has(relationship.fromId) || normalized.has(relationship.toId),
    )
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

const buildRelationship = (
  props: Partial<Parameters<typeof Relationship.create>[0]> = {},
) =>
  Relationship.create({
    id: props.id ?? crypto.randomUUID(),
    fromId: props.fromId ?? 'todo-a',
    toId: props.toId ?? 'todo-b',
    type: props.type ?? 'depends_on',
    description: props.description,
    createdAt: props.createdAt,
  })

const buildUseCase = (
  todos: readonly Todo[],
  relationships: readonly ReturnType<typeof Relationship.create>[] = [],
  overrides: Partial<ConstructorParameters<typeof GetBoardSnapshot>[0]> = {},
) =>
  new GetBoardSnapshot({
    repository: new FakeTodoRepository(todos),
    relationships: new FakeRelationshipRepository(relationships),
    viewportPadding: 100,
    ...overrides,
  })

describe('GetBoardSnapshot', () => {
  it('returns relationships scoped to provided todos', async () => {
    const tasks = [
      buildTodo({ id: 't-1', position: { x: -120, y: 90 } }),
      buildTodo({ id: 't-3', position: { x: 40, y: 300 } }),
    ]
    const relationships = [
      buildRelationship({ id: 'rel-1', fromId: 't-1', toId: 't-3' }),
      buildRelationship({ id: 'rel-2', fromId: 'external', toId: 'missing' }),
    ]
    const useCase = buildUseCase(tasks, relationships)

    const snapshot = await useCase.execute()

    expect(snapshot.relationships).toHaveLength(1)
    expect(snapshot.relationships[0].id).toBe('rel-1')
  })

  it('falls back to default viewport when no tasks exist', async () => {
    const useCase = buildUseCase([], [], {
      minViewportSize: 400,
      viewportPadding: 80,
    })

    const snapshot = await useCase.execute()

    expect(snapshot.tasks).toEqual([])
    expect(snapshot.relationships).toEqual([])
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
