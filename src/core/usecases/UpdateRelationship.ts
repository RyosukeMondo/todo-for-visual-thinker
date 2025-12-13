import type { RelationshipType } from '@core/domain/Relationship'
import { RelationshipNotFoundError, ValidationError } from '@core/errors'
import type { RelationshipRepository } from '@core/ports/RelationshipRepository'

export type UpdateRelationshipInput = Readonly<{
  id: string
  type?: RelationshipType
  description?: string | null
}>

export type UpdateRelationshipDependencies = Readonly<{
  repository: RelationshipRepository
}>

export class UpdateRelationship {
  constructor(private readonly deps: UpdateRelationshipDependencies) {}

  async execute(input: UpdateRelationshipInput) {
    const id = input.id?.trim()
    if (!id) {
      throw new ValidationError('Relationship id is required for updates', {
        field: 'id',
      })
    }

    if (!this.hasPayload(input)) {
      throw new ValidationError('At least one relationship property must change', {
        input,
      })
    }

    const relationship = await this.deps.repository.findById(id)
    if (!relationship) {
      throw new RelationshipNotFoundError(id)
    }

    let touched = false

    if (input.type && input.type !== relationship.type) {
      await this.ensureNoConflictingLink(relationship.id, {
        fromId: relationship.fromId,
        toId: relationship.toId,
        type: input.type,
      })
      relationship.changeType(input.type)
      touched = true
    }

    if (input.description !== undefined) {
      const previous = relationship.description
      relationship.attachDescription(this.normalizeDescription(input.description))
      touched = touched || previous !== relationship.description
    }

    if (!touched) {
      throw new ValidationError('Relationship already satisfies requested values', {
        input,
      })
    }

    await this.deps.repository.save(relationship)
    return relationship
  }

  private hasPayload(input: UpdateRelationshipInput): boolean {
    return input.type !== undefined || input.description !== undefined
  }

  private normalizeDescription(value?: string | null): string | undefined {
    if (value == null) {
      return undefined
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  private async ensureNoConflictingLink(
    relationshipId: string,
    params: { fromId: string; toId: string; type: RelationshipType },
  ): Promise<void> {
    const duplicate = await this.deps.repository.findBetween(
      params.fromId,
      params.toId,
      params.type,
    )
    if (duplicate && duplicate.id !== relationshipId) {
      throw new ValidationError('Relationship already exists between the specified todos', {
        fromId: params.fromId,
        toId: params.toId,
        type: params.type,
      })
    }
  }
}
