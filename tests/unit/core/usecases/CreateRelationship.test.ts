import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CreateRelationship } from '@/core/usecases'
import type { TodoRepository } from '@core/ports/TodoRepository'
import type { RelationshipRepository } from '@core/ports/RelationshipRepository'
import { Relationship } from '@core/domain/Relationship'
import { TodoNotFoundError, ValidationError } from '@core/errors'

const buildTodoRepository = () =>
  ({
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue({ id: 'todo-1' }),
    list: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }) satisfies TodoRepository

const buildRelationshipRepository = () =>
  ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findBetween: vi.fn().mockResolvedValue(null),
    list: vi.fn(),
    delete: vi.fn(),
    deleteByTodoId: vi.fn(),
  }) satisfies RelationshipRepository

const buildUseCase = (overrides: Partial<ConstructorParameters<typeof CreateRelationship>[0]> = {}) => {
  const todos = overrides.todos ?? buildTodoRepository()
  const relationships = overrides.relationships ?? buildRelationshipRepository()
  const idGenerator = overrides.idGenerator ?? vi.fn(() => 'rel-1')
  const clock = overrides.clock ?? vi.fn(() => new Date('2024-04-01T00:00:00Z'))

  return {
    useCase: new CreateRelationship({ todos, relationships, idGenerator, clock }),
    todos,
    relationships,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CreateRelationship use case', () => {
  it('persists new relationship between two todos', async () => {
    const { useCase, relationships } = buildUseCase()

    const relationship = await useCase.execute({
      fromId: 'todo-1',
      toId: 'todo-2',
      type: 'depends_on',
      description: 'Sequencing work',
    })

    expect(relationship).toBeInstanceOf(Relationship)
    expect(relationships.save).toHaveBeenCalledWith(relationship)
  })
})

describe('CreateRelationship input validation', () => {
  it('rejects self-referencing relationships', async () => {
    const { useCase, relationships } = buildUseCase()

    await expect(
      useCase.execute({ fromId: 'todo-1', toId: 'todo-1', type: 'blocks' }),
    ).rejects.toThrow(ValidationError)
    expect(relationships.save).not.toHaveBeenCalled()
  })

  it('throws TodoNotFoundError when endpoints are missing', async () => {
    const missingTodos = buildTodoRepository()
    missingTodos.findById = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'todo-2' })
    const { useCase } = buildUseCase({ todos: missingTodos })

    await expect(
      useCase.execute({ fromId: 'missing', toId: 'todo-2', type: 'blocks' }),
    ).rejects.toThrow(TodoNotFoundError)
  })

  it('prevents creating duplicate relationships', async () => {
    const duplicateRepo = buildRelationshipRepository()
    duplicateRepo.findBetween = vi
      .fn()
      .mockResolvedValue(
        Relationship.create({
          id: 'existing',
          fromId: 'todo-1',
          toId: 'todo-2',
          type: 'related_to',
        }),
      )

    const { useCase } = buildUseCase({ relationships: duplicateRepo })

    await expect(
      useCase.execute({ fromId: 'todo-1', toId: 'todo-2', type: 'related_to' }),
    ).rejects.toThrow(ValidationError)
  })
})
