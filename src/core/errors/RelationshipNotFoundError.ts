import { DomainError } from './DomainError'

export class RelationshipNotFoundError extends DomainError {
  constructor(ids: string | string[]) {
    const missingIds = (Array.isArray(ids) ? ids : [ids]).map((value) => value.trim())
    const unique = Array.from(new Set(missingIds))
    const message =
      unique.length === 1
        ? `Relationship not found: ${unique[0]}`
        : `Relationships not found: ${unique.join(', ')}`

    super(message, 'RELATIONSHIP_NOT_FOUND', { ids: unique })
  }
}
