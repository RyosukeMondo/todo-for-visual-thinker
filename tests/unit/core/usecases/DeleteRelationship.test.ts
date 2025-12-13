import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RelationshipRepository } from '@/core/ports/RelationshipRepository'
import { DeleteRelationship } from '@/core/usecases/DeleteRelationship'
import { Relationship } from '@/core/domain/Relationship'
import {
  RelationshipNotFoundError,
  ValidationError,
} from '@/core/errors'

const buildRelationship = (id: string) =>
  Relationship.create({
    id,
    fromId: `from-${id}`,
    toId: `to-${id}`,
    type: 'depends_on',
  })

const buildRepository = () =>
  ({
    save: vi.fn(),
    findById: vi.fn(),
    findBetween: vi.fn(),
    list: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteByTodoId: vi.fn(),
  }) satisfies RelationshipRepository

describe('DeleteRelationship use case', () => {
  let repository: ReturnType<typeof buildRepository>
  let useCase: DeleteRelationship

  beforeEach(() => {
    repository = buildRepository()
    useCase = new DeleteRelationship({ repository })
  })

  it('removes a single relationship when found', async () => {
    const relationship = buildRelationship('rel-1')
    repository.findById.mockResolvedValueOnce(relationship)

    await useCase.execute({ ids: 'rel-1' })

    expect(repository.findById).toHaveBeenCalledWith('rel-1')
    expect(repository.delete).toHaveBeenCalledWith('rel-1')
  })

  it('removes multiple unique relationships sequentially when all exist', async () => {
    repository.findById
      .mockResolvedValueOnce(buildRelationship('rel-1'))
      .mockResolvedValueOnce(buildRelationship('rel-2'))

    await useCase.execute({ ids: ['rel-1', 'rel-2', 'rel-1'] })

    expect(repository.findById).toHaveBeenCalledTimes(2)
    expect(repository.delete).toHaveBeenCalledTimes(2)
    expect(repository.delete).toHaveBeenNthCalledWith(1, 'rel-1')
    expect(repository.delete).toHaveBeenNthCalledWith(2, 'rel-2')
  })

  it('throws when normalized identifiers are empty', async () => {
    await expect(useCase.execute({ ids: ['   ', ''] })).rejects.toThrow(
      ValidationError,
    )
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('throws when deleting a missing single relationship', async () => {
    repository.findById.mockResolvedValueOnce(null)

    await expect(useCase.execute({ ids: 'rel-404' })).rejects.toThrow(
      RelationshipNotFoundError,
    )
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('throws when any relationship in a batch is missing', async () => {
    repository.findById
      .mockResolvedValueOnce(buildRelationship('rel-1'))
      .mockResolvedValueOnce(null)

    await expect(
      useCase.execute({ ids: ['rel-1', 'rel-2'] }),
    ).rejects.toThrow(RelationshipNotFoundError)
    expect(repository.delete).not.toHaveBeenCalled()
  })
})
