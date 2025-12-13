import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UpdateRelationship } from '@/core/usecases/UpdateRelationship'
import type { RelationshipRepository } from '@core/ports/RelationshipRepository'
import { Relationship } from '@core/domain/Relationship'
import { RelationshipNotFoundError, ValidationError } from '@core/errors'

const buildRelationship = () =>
  Relationship.create({
    id: 'rel-1',
    fromId: 'todo-visual',
    toId: 'todo-canvas',
    type: 'depends_on',
    description: 'Initial link',
    createdAt: new Date('2024-05-01T00:00:00.000Z'),
  })

const buildRepository = () =>
  ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(buildRelationship()),
    findBetween: vi.fn().mockResolvedValue(null),
    list: vi.fn(),
    delete: vi.fn(),
    deleteByTodoId: vi.fn(),
  }) satisfies RelationshipRepository

describe('UpdateRelationship use case', () => {
  let repository: ReturnType<typeof buildRepository>
  let useCase: UpdateRelationship

  beforeEach(() => {
    repository = buildRepository()
    useCase = new UpdateRelationship({ repository })
    vi.clearAllMocks()
  })

  it('updates relationship type and persists entity', async () => {
    const updated = await useCase.execute({ id: 'rel-1', type: 'blocks' })

    expect(updated.type).toBe('blocks')
    expect(repository.save).toHaveBeenCalledWith(updated)
    expect(repository.findBetween).toHaveBeenCalledWith(
      'todo-visual',
      'todo-canvas',
      'blocks',
    )
  })

  it('allows clearing descriptions when provided an empty string', async () => {
    const relationship = buildRelationship()
    repository.findById.mockResolvedValueOnce(relationship)

    await useCase.execute({ id: 'rel-1', description: '' })

    expect(relationship.description).toBeUndefined()
  })

  it('throws when no changes are requested', async () => {
    await expect(useCase.execute({ id: 'rel-1' })).rejects.toThrow(
      ValidationError,
    )
  })

  it('throws when the relationship cannot be found', async () => {
    repository.findById.mockResolvedValueOnce(null)

    await expect(
      useCase.execute({ id: 'missing', type: 'related_to' }),
    ).rejects.toThrow(RelationshipNotFoundError)
  })

  it('prevents conflicting links when changing relationship type', async () => {
    repository.findBetween.mockResolvedValueOnce(
      Relationship.create({
        id: 'existing',
        fromId: 'todo-visual',
        toId: 'todo-canvas',
        type: 'related_to',
      }),
    )

    await expect(
      useCase.execute({ id: 'rel-1', type: 'related_to' }),
    ).rejects.toThrow(ValidationError)
    expect(repository.save).not.toHaveBeenCalled()
  })
})
