import {
  RelationshipNotFoundError,
  ValidationError,
} from '@core/errors'
import type { RelationshipRepository } from '@core/ports/RelationshipRepository'

export type DeleteRelationshipDependencies = Readonly<{
  repository: RelationshipRepository
}>

export type DeleteRelationshipInput = Readonly<{
  ids: string | string[]
}>

export class DeleteRelationship {
  constructor(private readonly deps: DeleteRelationshipDependencies) {}

  async execute(input: DeleteRelationshipInput): Promise<void> {
    const identifiers = this.normalizeIds(input.ids)
    if (identifiers.length === 0) {
      throw new ValidationError('At least one relationship id must be provided', {
        ids: input.ids,
      })
    }

    if (identifiers.length === 1) {
      await this.deleteSingle(identifiers[0]!)
      return
    }

    await this.deleteMany(identifiers)
  }

  private async deleteSingle(id: string): Promise<void> {
    const relationship = await this.deps.repository.findById(id)
    if (!relationship) {
      throw new RelationshipNotFoundError(id)
    }
    await this.deps.repository.delete(id)
  }

  private async deleteMany(ids: string[]): Promise<void> {
    const relationships = await Promise.all(
      ids.map((id) => this.deps.repository.findById(id)),
    )
    const missing = ids.filter((_, index) => !relationships[index])
    if (missing.length > 0) {
      throw new RelationshipNotFoundError(missing)
    }
    for (const id of ids) {
      await this.deps.repository.delete(id)
    }
  }

  private normalizeIds(ids: string | string[]): string[] {
    const values = Array.isArray(ids) ? ids : [ids]
    return Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    )
  }
}
