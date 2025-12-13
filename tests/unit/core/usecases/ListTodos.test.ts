import { beforeEach, describe, expect, it } from 'vitest'

import { Todo } from '@/core/domain/Todo'
import type { TodoRepository } from '@/core/ports'
import { ListTodos } from '@/core/usecases'
import { ValidationError } from '@/core/errors'

class InMemoryTodoRepository implements TodoRepository {
  private readonly store = new Map<string, Todo>()

  async save(todo: Todo): Promise<void> {
    this.store.set(todo.id, Todo.restore(todo.toJSON()))
  }

  async findById(id: string): Promise<Todo | null> {
    const found = this.store.get(id)
    return found ? Todo.restore(found.toJSON()) : null
  }

  async list(): Promise<Todo[]> {
    return Array.from(this.store.values()).map((todo) =>
      Todo.restore(todo.toJSON()),
    )
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async deleteMany(ids: string[]): Promise<void> {
    ids.forEach((id) => this.store.delete(id))
  }
}

const buildTodo = (overrides: Partial<Parameters<typeof Todo.create>[0]> = {}) =>
  Todo.create({
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Todo item',
    status: overrides.status,
    priority: overrides.priority,
    category: overrides.category,
    color: overrides.color,
    position: overrides.position,
    description: overrides.description,
    createdAt: overrides.createdAt,
  })

describe('ListTodos use case', () => {
  let repository: TodoRepository
  let useCase: ListTodos

  beforeEach(() => {
    repository = new InMemoryTodoRepository()
    useCase = new ListTodos({ repository })
  })

  it('delegates to repository with normalized defaults', async () => {
    const todo = buildTodo({ title: 'Canvas research' })
    await repository.save(todo)

    const results = await useCase.execute({ category: '  Canvas  ' })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Canvas research')
  })

  it('caps limit and trims search terms', async () => {
    await expect(
      useCase.execute({ limit: 0 }),
    ).rejects.toThrow(ValidationError)

    const normalized = await useCase.execute({
      limit: 10_000,
      search: '  palette ',
    })
    expect(normalized).toHaveLength(0)
  })

  it('validates invalid inputs before hitting repository', async () => {
    await expect(
      useCase.execute({ status: ['pending', 'invalid' as never] }),
    ).rejects.toThrow(ValidationError)

    await expect(
      useCase.execute({
        priorityRange: { min: 5, max: 1 },
      }),
    ).rejects.toThrow(ValidationError)

    await expect(
      useCase.execute({
        viewport: { x: { min: 10, max: -10 }, y: { min: 0, max: 1 } },
      }),
    ).rejects.toThrow(ValidationError)

    await expect(
      useCase.execute({ sort: { field: 'priority', direction: 'down' as never } }),
    ).rejects.toThrow(ValidationError)
  })

  it('enforces search term length limits', async () => {
    await expect(
      useCase.execute({ search: 'a'.repeat(500) }),
    ).rejects.toThrow(ValidationError)
  })
})
