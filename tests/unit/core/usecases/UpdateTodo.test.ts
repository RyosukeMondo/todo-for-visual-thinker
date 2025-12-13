import { describe, expect, it, vi } from 'vitest'

import { Todo } from '@/core/domain/Todo'
import { UpdateTodo } from '@/core/usecases'
import type { TodoRepository } from '@/core/ports'
import { TodoNotFoundError, ValidationError } from '@/core/errors'

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

const baseTodo = () =>
  Todo.create({
    id: 'todo-1',
    title: 'Sketch task cards',
    color: '#60a5fa',
    category: 'Design',
    position: { x: 0, y: 0 },
  })

const clock = vi.fn(() => new Date('2024-04-10T08:00:00.000Z'))

const initialize = async (): Promise<{
  repository: TodoRepository
  useCase: UpdateTodo
}> => {
  const repository = new InMemoryTodoRepository()
  await repository.save(baseTodo())
  vi.clearAllMocks()
  return {
    repository,
    useCase: new UpdateTodo({ repository, clock }),
  }
}

describe('UpdateTodo use case - mutations', () => {
  it('applies textual, icon, and category updates', async () => {
    const { useCase, repository } = await initialize()

    const updated = await useCase.execute({
      id: 'todo-1',
      title: '  Map neon palette  ',
      description: '  Explore gradient anchors ',
      category: '  Research ',
      icon: ' spark ',
      priority: 5,
      color: '#f97316',
    })

    expect(updated.title).toBe('Map neon palette')
    expect(updated.description).toBe('Explore gradient anchors')
    expect(updated.category).toBe('Research')
    expect(updated.icon).toBe('spark')
    expect(updated.priority).toBe(5)
    expect(updated.color).toBe('#f97316')

    const persisted = await repository.findById('todo-1')
    expect(persisted?.title).toBe('Map neon palette')
  })

  it('updates spatial coordinates and status transitions', async () => {
    const { useCase } = await initialize()

    const updated = await useCase.execute({
      id: 'todo-1',
      position: { x: 250 },
      status: 'completed',
    })

    expect(updated.position).toEqual({ x: 250, y: 0 })
    expect(updated.status).toBe('completed')
    expect(updated.completedAt?.toISOString()).toBe(
      '2024-04-10T08:00:00.000Z',
    )

    const reopened = await useCase.execute({
      id: 'todo-1',
      status: 'pending',
    })
    expect(reopened.status).toBe('pending')
    expect(reopened.completedAt).toBeUndefined()
  })
})

describe('UpdateTodo use case - validation', () => {
  it('rejects unknown todos or requests without changes', async () => {
    const { useCase } = await initialize()

    await expect(
      useCase.execute({ id: 'missing', title: 'Test' }),
    ).rejects.toThrow(TodoNotFoundError)

    await expect(useCase.execute({ id: 'todo-1' })).rejects.toThrow(
      ValidationError,
    )
  })

  it('requires identifiers', async () => {
    const repository = new InMemoryTodoRepository()
    const useCase = new UpdateTodo({ repository })
    await expect(
      useCase.execute({ id: '   ' as string, title: 'Test' }),
    ).rejects.toThrow(ValidationError)
  })
})
