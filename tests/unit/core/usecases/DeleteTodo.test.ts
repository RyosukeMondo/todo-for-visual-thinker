import { describe, expect, it, vi } from 'vitest'

import type { RelationshipRepository, TodoRepository } from '@/core/ports'
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

const buildRelationships = () =>
  ({
    deleteByTodoId: vi.fn().mockResolvedValue(undefined),
  }) satisfies Pick<RelationshipRepository, 'deleteByTodoId'>

const setup = () => {
  const repository = buildRepository()
  const relationships = buildRelationships()
  const useCase = new DeleteTodo({ repository, relationships })
  const execute = (ids: string | string[]) => useCase.execute({ ids })
  const assertClean = () => {
    expect(repository.delete).not.toHaveBeenCalled()
    expect(repository.deleteMany).not.toHaveBeenCalled()
    expect(relationships.deleteByTodoId).not.toHaveBeenCalled()
  }
  return { repository, relationships, execute, assertClean }
}

describe('DeleteTodo use case', () => {
  it('removes a single todo when it exists', async () => {
    const { repository, relationships, execute } = setup()
    const todo = buildTodo('todo-1')
    repository.findById.mockResolvedValue(todo)

    await execute('todo-1')

    expect(repository.findById).toHaveBeenCalledWith('todo-1')
    expect(repository.delete).toHaveBeenCalledWith('todo-1')
    expect(relationships.deleteByTodoId).toHaveBeenCalledWith('todo-1')
    expect(repository.deleteMany).not.toHaveBeenCalled()
  })

  it('removes multiple todos atomically when all exist', async () => {
    const { repository, relationships, execute } = setup()
    repository.findById.mockResolvedValueOnce(buildTodo('todo-1'))
    repository.findById.mockResolvedValueOnce(buildTodo('todo-2'))

    await execute(['todo-1', 'todo-2', 'todo-1'])

    expect(repository.findById).toHaveBeenCalledTimes(2)
    expect(repository.deleteMany).toHaveBeenCalledWith(['todo-1', 'todo-2'])
    expect(relationships.deleteByTodoId).toHaveBeenCalledTimes(2)
    expect(relationships.deleteByTodoId).toHaveBeenNthCalledWith(1, 'todo-1')
    expect(relationships.deleteByTodoId).toHaveBeenNthCalledWith(2, 'todo-2')
  })

  describe('validation', () => {
    it('rejects when ids are empty after normalization', async () => {
      const { assertClean, execute } = setup()
      await expect(execute(['   ', ''])).rejects.toThrow(ValidationError)
      assertClean()
    })

    it('rejects when single todo does not exist', async () => {
      const { repository, relationships, execute } = setup()
      repository.findById.mockResolvedValue(null)

      await expect(execute('missing')).rejects.toThrow(TodoNotFoundError)
      expect(repository.delete).not.toHaveBeenCalled()
      expect(relationships.deleteByTodoId).not.toHaveBeenCalled()
    })

    it('rejects when any batch todo does not exist', async () => {
      const { repository, relationships, execute } = setup()
      repository.findById
        .mockResolvedValueOnce(buildTodo('todo-1'))
        .mockResolvedValueOnce(null)

      await expect(execute(['todo-1', 'todo-2'])).rejects.toThrow(
        TodoNotFoundError,
      )
      expect(repository.deleteMany).not.toHaveBeenCalled()
      expect(relationships.deleteByTodoId).not.toHaveBeenCalled()
    })
  })
})
