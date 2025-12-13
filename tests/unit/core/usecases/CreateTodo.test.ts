import { describe, expect, it, vi } from 'vitest'

import { CreateTodo } from '@/core/usecases'
import type { Logger, TodoRepository } from '@core/ports'
import { ValidationError } from '@/core/errors'

const fixedDate = new Date('2024-03-10T12:00:00.000Z')

const buildRepository = () =>
  ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(undefined),
  }) satisfies TodoRepository

const buildLogger = (): Logger => ({
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
})

const buildUseCase = (overrides: Partial<{ logger: Logger }> = {}) => {
  const repository = buildRepository()
  const clock = vi.fn(() => fixedDate)
  const idGenerator = vi.fn(() => 'todo-001')
  const useCase = new CreateTodo({
    repository,
    idGenerator,
    clock,
    logger: overrides.logger,
  })
  return { useCase, repository, clock, idGenerator }
}

describe('CreateTodo persistence', () => {
  it('persists a newly created todo with injected dependencies', async () => {
    const { useCase, repository, idGenerator } = buildUseCase()

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
    const { useCase, repository } = buildUseCase()

    await expect(useCase.execute({ title: '   ' })).rejects.toThrow(
      ValidationError,
    )
    expect(repository.save).not.toHaveBeenCalled()
  })
})

describe('CreateTodo states', () => {
  it('supports creating todos in completed state when requested', async () => {
    const { useCase } = buildUseCase()

    const todo = await useCase.execute({
      title: 'Ship neon canvas',
      status: 'completed',
    })

    expect(todo.status).toBe('completed')
    expect(todo.completedAt?.toISOString()).toBe(fixedDate.toISOString())
  })
})

describe('CreateTodo logging', () => {
  it('logs structured metadata after persistence', async () => {
    const logger = buildLogger()
    const { useCase } = buildUseCase({ logger })

    const todo = await useCase.execute({
      title: 'Design palette',
      category: 'Design',
      priority: 5,
    })

    expect(logger.info).toHaveBeenCalledWith('todo.created', {
      todoId: todo.id,
      status: todo.status,
      priority: todo.priority,
      category: 'Design',
    })
  })

  it('defaults category to uncategorized when none provided', async () => {
    const logger = buildLogger()
    const { useCase } = buildUseCase({ logger })

    const todo = await useCase.execute({ title: 'Grid theme' })

    expect(logger.info).toHaveBeenCalledWith('todo.created', {
      todoId: todo.id,
      status: todo.status,
      priority: todo.priority,
      category: 'uncategorized',
    })
  })
})
