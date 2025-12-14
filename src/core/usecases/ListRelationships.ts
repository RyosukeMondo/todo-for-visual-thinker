import type {
  Relationship,
  RelationshipType,
} from '@core/domain/Relationship'
import { ValidationError } from '@core/errors'
import type {
  RelationshipQuery,
  RelationshipRepository,
} from '@core/ports/RelationshipRepository'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500
const ALLOWED_TYPES: readonly RelationshipType[] = [
  'depends_on',
  'blocks',
  'related_to',
  'parent_of',
] as const

export type ListRelationshipsInput = RelationshipQuery

export type ListRelationshipsDependencies = Readonly<{
  repository: RelationshipRepository
}>

export class ListRelationships {
  constructor(private readonly deps: ListRelationshipsDependencies) {}

  async execute(query: ListRelationshipsInput = {}): Promise<Relationship[]> {
    const normalized = this.normalizeQuery(query)
    return this.deps.repository.list(normalized)
  }

  private normalizeQuery(query: ListRelationshipsInput): RelationshipQuery {
    this.assertLimit(query.limit)
    this.assertOffset(query.offset)

    return {
      ...query,
      fromId: this.normalizeIdentifier(query.fromId, 'fromId'),
      toId: this.normalizeIdentifier(query.toId, 'toId'),
      involving: this.normalizeIdentifier(query.involving, 'involving'),
      type: this.normalizeTypes(query.type),
      limit: this.normalizeLimit(query.limit),
      offset: query.offset ?? 0,
    }
  }

  private normalizeIdentifier(
    value: string | undefined,
    field: 'fromId' | 'toId' | 'involving',
  ): string | undefined {
    if (value === undefined) return undefined
    const trimmed = value.trim()
    if (!trimmed) {
      throw new ValidationError(`${field} cannot be empty`, { field })
    }
    return trimmed
  }

  private normalizeTypes(
    type: ListRelationshipsInput['type'],
  ): RelationshipType | RelationshipType[] | undefined {
    if (!type) return undefined
    const values = Array.isArray(type) ? type : [type]
    values.forEach((entry) => this.assertType(entry))
    const unique = [...new Set(values)]
    return unique.length === 1 ? unique[0] : unique
  }

  private normalizeLimit(limit?: number): number {
    if (limit === undefined) {
      return DEFAULT_LIMIT
    }
    return Math.min(limit, MAX_LIMIT)
  }

  private assertType(type: RelationshipType): void {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new ValidationError('Unknown relationship type filter', {
        type,
      })
    }
  }

  private assertLimit(limit?: number): void {
    if (limit === undefined) return
    if (!Number.isInteger(limit) || limit < 1) {
      throw new ValidationError('Limit must be a positive integer', {
        limit,
      })
    }
  }

  private assertOffset(offset?: number): void {
    if (offset === undefined) return
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError('Offset must be zero or a positive integer', {
        offset,
      })
    }
  }
}
