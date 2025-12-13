import { describe, expect, it, vi } from 'vitest'

import { Relationship } from '@/core/domain/Relationship'
import type { RelationshipRepository } from '@/core/ports/RelationshipRepository'
import { ListRelationships } from '@/core/usecases/ListRelationships'
import { ValidationError } from '@/core/errors'

const buildRepository = () =>
  ({
    list: vi.fn().mockResolvedValue([
      Relationship.create({
        id: 'rel-001',
        fromId: 'todo-1',
        toId: 'todo-2',
        type: 'depends_on',
      }),
    ]),
  }) satisfies Pick<RelationshipRepository, 'list'>

const buildUseCase = (repository = buildRepository()) =>
  new ListRelationships({ repository })

describe('ListRelationships defaults', () => {
  it('delegates to repository with normalized defaults when no filters provided', async () => {
    const repository = buildRepository()
    const useCase = buildUseCase(repository)

    const result = await useCase.execute()

    expect(result).toHaveLength(1)
    expect(repository.list).toHaveBeenCalledWith({
      limit: 100,
      offset: 0,
    })
  })

  it('caps the limit to the configured maximum', async () => {
    const repository = buildRepository()
    const useCase = buildUseCase(repository)

    await useCase.execute({ limit: 999 })

    expect(repository.list).toHaveBeenCalledWith({
      limit: 500,
      offset: 0,
    })
  })
})

describe('ListRelationships normalization', () => {
  it('normalizes identifiers and filters to trimmed, unique values', async () => {
    const repository = buildRepository()
    const useCase = buildUseCase(repository)

    await useCase.execute({
      fromId: ' todo-1 ',
      toId: ' todo-2 ',
      involving: ' todo-3 ',
      type: ['depends_on', 'depends_on', 'blocks'],
      limit: 200,
      offset: 5,
    })

    expect(repository.list).toHaveBeenCalledWith({
      fromId: 'todo-1',
      toId: 'todo-2',
      involving: 'todo-3',
      type: ['depends_on', 'blocks'],
      limit: 200,
      offset: 5,
    })
  })
})

describe('ListRelationships validation errors', () => {
  it('rejects empty identifier filters to avoid ambiguous queries', async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute({ fromId: '   ' }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects invalid type filters and invalid numeric bounds', async () => {
    const useCase = buildUseCase()

    await expect(
      useCase.execute({ type: ['unknown' as never] }),
    ).rejects.toThrow(ValidationError)

    await expect(
      useCase.execute({ limit: 0 }),
    ).rejects.toThrow(ValidationError)

    await expect(
      useCase.execute({ offset: -1 }),
    ).rejects.toThrow(ValidationError)
  })
})
