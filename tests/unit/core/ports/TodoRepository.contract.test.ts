import { beforeEach, describe, expect, it } from 'vitest'

import {
  Todo,
  type CreateTodoInput,
  type TodoPriority,
} from '@/core/domain/Todo'
import type {
  ListTodosQuery,
  TodoRepository,
} from '@/core/ports/TodoRepository'

class InMemoryTodoRepository implements TodoRepository {
  private readonly store = new Map<string, Todo>()

  async save(todo: Todo): Promise<void> {
    this.store.set(todo.id, Todo.restore(todo.toJSON()))
  }

  async findById(id: string): Promise<Todo | null> {
    const found = this.store.get(id)
    return found ? Todo.restore(found.toJSON()) : null
  }

  async list(query: ListTodosQuery = {}): Promise<Todo[]> {
    const clones = Array.from(this.store.values()).map((todo) =>
      Todo.restore(todo.toJSON()),
    )

    const filtered = this.applyFilters(clones, query)
    const sorted = this.applySort(filtered, query)
    return this.applyPagination(sorted, query)
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async deleteMany(ids: string[]): Promise<void> {
    ids.forEach((id) => this.store.delete(id))
  }

  private applyFilters(
    todos: Todo[],
    query: ListTodosQuery,
  ): Todo[] {
    return todos.filter((todo) => this.matchesFilters(todo, query))
  }

  private applySort(todos: Todo[], query: ListTodosQuery): Todo[] {
    const sortField = query.sort?.field ?? 'createdAt'
    const sortDirection = query.sort?.direction ?? 'asc'
    return [...todos].sort((a, b) =>
      this.compare(a, b, sortField, sortDirection),
    )
  }

  private applyPagination(
    todos: Todo[],
    query: ListTodosQuery,
  ): Todo[] {
    const offset = query.offset ?? 0
    const limit = query.limit ?? todos.length
    return todos.slice(offset, offset + limit)
  }

  private matchesFilters(todo: Todo, query: ListTodosQuery): boolean {
    if (!this.matchesStatus(todo.status, query.status)) return false
    if (
      query.category &&
      todo.category?.toLowerCase() !== query.category.toLowerCase()
    ) {
      return false
    }
    if (query.search && !this.matchesSearch(todo, query.search)) return false
    if (
      query.priorityRange &&
      !this.matchesPriority(todo.priority, query.priorityRange)
    ) {
      return false
    }
    if (query.viewport && !this.matchesViewport(todo, query.viewport)) return false
    return true
  }

  private matchesStatus(
    status: Todo['status'],
    filter?: ListTodosQuery['status'],
  ): boolean {
    if (!filter) return true
    const statuses = Array.isArray(filter) ? filter : [filter]
    return statuses.includes(status)
  }

  private matchesSearch(todo: Todo, term: string): boolean {
    const needle = term.trim().toLowerCase()
    if (!needle) return true
    const description = todo.description?.toLowerCase() ?? ''
    const category = todo.category?.toLowerCase() ?? ''
    return (
      todo.title.toLowerCase().includes(needle) ||
      description.includes(needle) ||
      category.includes(needle)
    )
  }

  private matchesPriority(
    priority: TodoPriority,
    range: NonNullable<ListTodosQuery['priorityRange']>,
  ): boolean {
    if (typeof range.min === 'number' && priority < range.min) return false
    if (typeof range.max === 'number' && priority > range.max) return false
    return true
  }

  private matchesViewport(
    todo: Todo,
    viewport: NonNullable<ListTodosQuery['viewport']>,
  ): boolean {
    const { x, y } = todo.position
    return (
      x >= viewport.x.min &&
      x <= viewport.x.max &&
      y >= viewport.y.min &&
      y <= viewport.y.max
    )
  }

  private compare(
    a: Todo,
    b: Todo,
    field: NonNullable<ListTodosQuery['sort']>['field'],
    direction: NonNullable<ListTodosQuery['sort']>['direction'] = 'asc',
  ): number {
    const factor = direction === 'asc' ? 1 : -1
    const valueA = a[field]
    const valueB = b[field]

    if (valueA instanceof Date && valueB instanceof Date) {
      return (valueA.getTime() - valueB.getTime()) * factor
    }

    return ((valueA as number) - (valueB as number)) * factor
  }
}

type BuildTodoOverrides = Partial<CreateTodoInput> & { completedAt?: Date }

let sequence = 0
const buildTodo = (overrides: BuildTodoOverrides = {}): Todo => {
  sequence += 1
  const createdAt =
    overrides.createdAt ??
    new Date(`2024-01-${String(sequence).padStart(2, '0')}T00:00:00.000Z`)
  const todo = Todo.create({
    id: overrides.id ?? `todo-${sequence}`,
    title: overrides.title ?? `Todo ${sequence}`,
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
    todo.markCompleted(overrides.completedAt ?? createdAt)
  }

  if (overrides.status === 'in_progress') {
    todo.markInProgress()
  }

  return todo
}

const createRepository = (): TodoRepository => new InMemoryTodoRepository()

describe('TodoRepository contract - persistence', () => {
  let repository: TodoRepository

  beforeEach(() => {
    repository = createRepository()
  })

  it('persists and retrieves todos by id', async () => {
    const todo = buildTodo()
    await repository.save(todo)

    const stored = await repository.findById(todo.id)
    expect(stored?.toJSON()).toMatchObject({ id: todo.id, title: todo.title })
  })

  it('updates existing todos when saving with same id', async () => {
    const todo = buildTodo({ title: 'Original' })
    await repository.save(todo)

    todo.rename('Updated')
    await repository.save(todo)

    const stored = await repository.findById(todo.id)
    expect(stored?.title).toBe('Updated')
  })
})

describe('TodoRepository contract - filtering', () => {
  let repository: TodoRepository

  beforeEach(() => {
    repository = createRepository()
  })

  it('filters todos by status and category', async () => {
    const pending = buildTodo({ status: 'pending', category: 'Focus' })
    const done = buildTodo({
      status: 'completed',
      category: 'Archive',
      completedAt: new Date(),
    })
    await repository.save(pending)
    await repository.save(done)

    const filtered = await repository.list({
      status: ['pending'],
      category: 'focus',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe(pending.id)
  })

  it('searches across title, description, and category fields', async () => {
    await repository.save(buildTodo({ title: 'Sketch color ideas' }))
    await repository.save(
      buildTodo({
        description: 'Refine typography scale',
        category: 'Typography',
      }),
    )

    const results = await repository.list({ search: 'typography' })
    expect(results).toHaveLength(1)
    expect(results[0].description).toMatch(/typography/i)
  })

  it('filters by priority range and viewport', async () => {
    await repository.save(
      buildTodo({ priority: 2, position: { x: 100, y: 100 } }),
    )
    const inRange = buildTodo({ priority: 4, position: { x: 10, y: 15 } })
    await repository.save(inRange)

    const results = await repository.list({
      priorityRange: { min: 3 },
      viewport: { x: { min: 0, max: 50 }, y: { min: 0, max: 50 } },
    })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(inRange.id)
  })
})

describe('TodoRepository contract - sorting and pagination', () => {
  let repository: TodoRepository

  beforeEach(() => {
    repository = createRepository()
  })

  it('sorts, paginates, and defaults to createdAt ordering', async () => {
    const high = buildTodo({ priority: 5 })
    const low = buildTodo({ priority: 1 })
    await repository.save(high)
    await repository.save(low)

    const sorted = await repository.list({
      sort: { field: 'priority', direction: 'asc' },
      limit: 1,
      offset: 1,
    })

    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe(high.id)
  })
})

describe('TodoRepository contract - deletion safeguards', () => {
  let repository: TodoRepository

  beforeEach(() => {
    repository = createRepository()
  })

  it('removes todos via delete and deleteMany', async () => {
    const first = buildTodo()
    const second = buildTodo()
    await repository.save(first)
    await repository.save(second)

    await repository.delete(first.id)
    await repository.deleteMany([second.id])

    expect(await repository.findById(first.id)).toBeNull()
    expect(await repository.list()).toHaveLength(0)
  })

  it('returns defensive copies to protect stored state', async () => {
    const todo = buildTodo({ title: 'Immutable' })
    await repository.save(todo)

    const loaded = await repository.findById(todo.id)
    loaded?.rename('Mutated')
    const fresh = await repository.findById(todo.id)

    expect(fresh?.title).toBe('Immutable')
  })
})
