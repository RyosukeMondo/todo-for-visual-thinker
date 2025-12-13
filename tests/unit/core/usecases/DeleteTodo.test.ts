import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TodoRepository } from '@/core/ports'
import { DeleteTodo } from '@/core/usecases'
import { TodoNotFoundError, ValidationError } from '@/core/errors'
import { Todo } from '@/core/domain/Todo'

const buildTodo = (id: string) =>
  Todo.create({
    id,
    title: `Todo ${id}`,
  })

const buildRepository = () =>
  ({
    save: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(undefined),
  }) satisfies TodoRepository

describe('DeleteTodo use case', () => {
  let repository: ReturnType<typeof buildRepository>
  let useCase: DeleteTodo

  beforeEach(() => {
    repository = buildRepository()
    useCase = new DeleteTodo({ repository })
  })

  it('removes a single todo when it exists', async () => {
    const todo = buildTodo('todo-1')
    repository.findById.mockResolvedValue(todo)

    await useCase.execute({ ids: 'todo-1' })

    expect(repository.findById).toHaveBeenCalledWith('todo-1')
    expect(repository.delete).toHaveBeenCalledWith('todo-1')
    expect(repository.deleteMany).not.toHaveBeenCalled()
  })

  it('removes multiple todos atomically when all exist', async () => {
    repository.findById.mockResolvedValueOnce(buildTodo('todo-1'))
    repository.findById.mockResolvedValueOnce(buildTodo('todo-2'))

    await useCase.execute({ ids: ['todo-1', 'todo-2', 'todo-1'] })

    expect(repository.findById).toHaveBeenCalledTimes(2)
    expect(repository.deleteMany).toHaveBeenCalledWith(['todo-1', 'todo-2'])
  })

  it('rejects when ids are empty after normalization', async () => {
    await expect(useCase.execute({ ids: ['   ', ''] })).rejects.toThrow(
      ValidationError,
    )
    expect(repository.delete).not.toHaveBeenCalled()
    expect(repository.deleteMany).not.toHaveBeenCalled()
  })

  it('rejects when single todo does not exist', async () => {
    repository.findById.mockResolvedValue(null)

    await expect(useCase.execute({ ids: 'missing' })).rejects.toThrow(
      TodoNotFoundError,
    )
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('rejects when any batch todo does not exist', async () => {
    repository.findById
      .mockResolvedValueOnce(buildTodo('todo-1'))
      .mockResolvedValueOnce(null)

    await expect(
      useCase.execute({ ids: ['todo-1', 'todo-2'] }),
    ).rejects.toThrow(TodoNotFoundError)
    expect(repository.deleteMany).not.toHaveBeenCalled()
  })
})
