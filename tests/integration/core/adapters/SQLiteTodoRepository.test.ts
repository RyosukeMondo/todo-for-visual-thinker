import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SQLiteTodoRepository } from '@/core/adapters/SQLiteTodoRepository'
import { Todo, type CreateTodoInput } from '@/core/domain/Todo'

const createRepo = () => {
  const db = new Database(':memory:')
  const repository = new SQLiteTodoRepository(db)
  return { repository, db }
}

describe('SQLiteTodoRepository - persistence', () => {
  let db: Database
  let repository: SQLiteTodoRepository

  beforeEach(() => ({ db, repository } = createRepo()))

  afterEach(() => {
    db.close()
  })

  it('persists todos and retrieves by id', async () => {
    const todo = buildTodo({ title: 'Spatial planning' })
    await repository.save(todo)

    const stored = await repository.findById(todo.id)
    expect(stored?.toJSON()).toMatchObject({
      id: todo.id,
      title: 'Spatial planning',
    })
  })
})

describe('SQLiteTodoRepository - filtering', () => {
  let db: Database
  let repository: SQLiteTodoRepository

  beforeEach(() => ({ db, repository } = createRepo()))

  afterEach(() => {
    db.close()
  })

  it('filters by status, search, priority range, and viewport', async () => {
    await repository.save(
      buildTodo({
        title: 'Color study',
        status: 'pending',
        priority: 2,
        category: 'Focus',
        position: { x: 0, y: 0 },
      }),
    )
    const match = buildTodo({
      title: 'Typography grid',
      description: 'Refine hierarchy',
      status: 'in_progress',
      priority: 4,
      category: 'Focus',
      position: { x: 10, y: 10 },
    })
    await repository.save(match)

    const results = await repository.list({
      status: ['in_progress'],
      search: 'typography',
      category: 'focus',
      priorityRange: { min: 3 },
      viewport: { x: { min: -20, max: 20 }, y: { min: -20, max: 20 } },
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(match.id)
  })
})

describe('SQLiteTodoRepository - sorting and deletion', () => {
  let db: Database
  let repository: SQLiteTodoRepository

  beforeEach(() => ({ db, repository } = createRepo()))

  afterEach(() => {
    db.close()
  })

  it('orders todos by priority desc and createdAt asc by default', async () => {
    const earliestHigh = buildTodo({
      id: 'todo-early-high',
      priority: 5,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    })
    const laterHigh = buildTodo({
      id: 'todo-late-high',
      priority: 5,
      createdAt: new Date('2024-01-05T00:00:00.000Z'),
    })
    const medium = buildTodo({
      id: 'todo-medium',
      priority: 3,
      createdAt: new Date('2024-01-03T00:00:00.000Z'),
    })
    await repository.save(medium)
    await repository.save(laterHigh)
    await repository.save(earliestHigh)

    const ordered = await repository.list({
      sort: { field: 'priority', direction: 'desc' },
    })

    expect(ordered.map((todo) => todo.id)).toEqual([
      earliestHigh.id,
      laterHigh.id,
      medium.id,
    ])
  })

  it('sorts, paginates, and deletes todos', async () => {
    const low = buildTodo({ priority: 1 })
    const high = buildTodo({ priority: 5 })
    await repository.save(low)
    await repository.save(high)

    const sorted = await repository.list({
      sort: { field: 'priority', direction: 'desc' },
      limit: 1,
      offset: 0,
    })

    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe(high.id)

    await repository.delete(low.id)
    await repository.deleteMany([high.id])

    expect(await repository.list()).toHaveLength(0)
  })
})

let counter = 0
const buildTodo = (overrides: Partial<CreateTodoInput> = {}): Todo => {
  counter += 1
  const createdAt =
    overrides.createdAt ??
    new Date(`2024-02-${String(counter).padStart(2, '0')}T00:00:00.000Z`)

  const todo = Todo.create({
    id: overrides.id ?? `todo-${counter}`,
    title: overrides.title ?? `Todo ${counter}`,
    description: overrides.description,
    status: overrides.status,
    priority: overrides.priority,
    category: overrides.category,
    color: overrides.color,
    icon: overrides.icon,
    position: overrides.position,
    createdAt,
  })

  if (overrides.status === 'completed') {
    todo.markCompleted(overrides.createdAt ?? createdAt)
  }
  if (overrides.status === 'in_progress') {
    todo.markInProgress()
  }

  return todo
}
