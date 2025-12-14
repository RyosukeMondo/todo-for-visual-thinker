import { ValidationError } from '@core/errors'

export type RelationshipType =
  | 'depends_on'
  | 'blocks'
  | 'related_to'
  | 'parent_of'

const ALLOWED_TYPES: RelationshipType[] = [
  'depends_on',
  'blocks',
  'related_to',
  'parent_of',
]
const DESCRIPTION_LIMIT = 500

export type RelationshipProps = {
  id: string
  fromId: string
  toId: string
  type: RelationshipType
  description?: string
  createdAt: Date
  updatedAt: Date
}

export type CreateRelationshipInput = Readonly<{
  id: string
  fromId: string
  toId: string
  type: RelationshipType
  description?: string
  createdAt?: Date
}>

export class Relationship {
  private constructor(private readonly props: RelationshipProps) {
    this.ensureConsistency()
  }

  static create(input: CreateRelationshipInput): Relationship {
    const timestamp = input.createdAt ?? new Date()
    return new Relationship({
      id: input.id.trim(),
      fromId: input.fromId.trim(),
      toId: input.toId.trim(),
      type: input.type,
      description: input.description?.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  static restore(props: RelationshipProps): Relationship {
    return new Relationship({
      ...props,
      id: props.id.trim(),
      fromId: props.fromId.trim(),
      toId: props.toId.trim(),
      description: props.description?.trim(),
    })
  }

  get id(): string {
    return this.props.id
  }

  get fromId(): string {
    return this.props.fromId
  }

  get toId(): string {
    return this.props.toId
  }

  get type(): RelationshipType {
    return this.props.type
  }

  get description(): string | undefined {
    return this.props.description
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  changeType(type: RelationshipType): void {
    if (type === this.props.type) return
    this.assertType(type)
    this.props.type = type
    this.touch()
  }

  attachDescription(text: string | undefined): void {
    const normalized = text?.trim()
    if (normalized === this.props.description) return
    if (normalized) {
      this.assertDescription(normalized)
    }
    this.props.description = normalized
    this.touch()
  }

  connects(taskId: string): boolean {
    const trimmed = taskId.trim()
    return trimmed === this.props.fromId || trimmed === this.props.toId
  }

  toJSON(): RelationshipProps {
    return { ...this.props }
  }

  private touch(): void {
    this.props.updatedAt = new Date()
    this.ensureConsistency()
  }

  private ensureConsistency(): void {
    this.assertId(this.props.id, 'Relationship id is required')
    this.assertId(this.props.fromId, 'Source todo id is required')
    this.assertId(this.props.toId, 'Target todo id is required')
    this.assertDistinctEndpoints()
    this.assertType(this.props.type)
    if (this.props.description) {
      this.assertDescription(this.props.description)
    }
  }

  private assertId(value: string, message: string): void {
    if (!value.trim()) {
      throw new ValidationError(message)
    }
  }

  private assertDistinctEndpoints(): void {
    if (this.props.fromId === this.props.toId) {
      throw new ValidationError('Relationship endpoints must be different', {
        id: this.props.id,
      })
    }
  }

  private assertType(type: RelationshipType): void {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new ValidationError('Unknown relationship type', { type })
    }
  }

  private assertDescription(description: string): void {
    if (description.length > DESCRIPTION_LIMIT) {
      throw new ValidationError('Description exceeds allowed length', {
        max: DESCRIPTION_LIMIT,
      })
    }
  }
}
