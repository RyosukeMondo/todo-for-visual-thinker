import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CreateTodo } from '@/core/usecases'
import type { TodoRepository } from '@core/ports'
import { ValidationError } from '@/core/errors'

const buildRepository = () =>
  ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(undefined),
  }) satisfies TodoRepository

describe('CreateTodo use case', () => {
  const fixedDate = new Date('2024-03-10T12:00:00.000Z')
  const clock = vi.fn(() => fixedDate)
  const idGenerator = vi.fn(() => 'todo-001')
  type RepositoryMock = ReturnType<typeof buildRepository>
  let repository: RepositoryMock

  beforeEach(() => {
    vi.clearAllMocks()
    repository = buildRepository()
  })

  it('persists a newly created todo with injected dependencies', async () => {
    const useCase = new CreateTodo({ repository, idGenerator, clock })

    const todo = await useCase.execute({
      title: '   Map research journey   ',
      priority: 4,
      category: 'Research',
      color: '#f97316',
      icon: 'star',
      position: { x: 400, y: -120 },
    })

    expect(idGenerator).toHaveBeenCalledTimes(1)
    expect(repository.save).toHaveBeenCalledWith(todo)
    expect(todo.id).toBe('todo-001')
    expect(todo.title).toBe('Map research journey')
    expect(todo.priority).toBe(4)
    expect(todo.createdAt.toISOString()).toBe(fixedDate.toISOString())
  })

  it('rejects blank titles before touching the repository', async () => {
    const useCase = new CreateTodo({ repository, idGenerator, clock })

    await expect(useCase.execute({ title: '   ' })).rejects.toThrow(
      ValidationError,
    )
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('supports creating todos in completed state when requested', async () => {
    const useCase = new CreateTodo({ repository, idGenerator, clock })

    const todo = await useCase.execute({
      title: 'Ship neon canvas',
      status: 'completed',
    })

    expect(todo.status).toBe('completed')
    expect(todo.completedAt?.toISOString()).toBe(fixedDate.toISOString())
  })
})
