import { Relationship } from '@core/domain/Relationship'
import type { TodoRepository } from '@core/ports/TodoRepository'
import type { RelationshipRepository } from '@core/ports/RelationshipRepository'
import { TodoNotFoundError, ValidationError } from '@core/errors'

export type CreateRelationshipInput = Readonly<{
  fromId: string
  toId: string
  type: Relationship['type']
  description?: string
}>

export type CreateRelationshipDependencies = Readonly<{
  relationships: RelationshipRepository
  todos: TodoRepository
  idGenerator: () => string
  clock?: () => Date
}>

export class CreateRelationship {
  constructor(private readonly deps: CreateRelationshipDependencies) {}

  async execute(input: CreateRelationshipInput): Promise<Relationship> {
    this.ensureValidInput(input)

    const [fromTodo, toTodo] = await Promise.all([
      this.deps.todos.findById(input.fromId),
      this.deps.todos.findById(input.toId),
    ])

    if (!fromTodo && !toTodo) {
      throw new TodoNotFoundError([input.fromId, input.toId])
    }

    if (!fromTodo) {
      throw new TodoNotFoundError(input.fromId)
    }

    if (!toTodo) {
      throw new TodoNotFoundError(input.toId)
    }

    await this.ensureNotDuplicate(input)

    const timestamp = this.deps.clock?.() ?? new Date()
    const relationship = Relationship.create({
      id: this.deps.idGenerator(),
      fromId: input.fromId,
      toId: input.toId,
      type: input.type,
      description: input.description,
      createdAt: timestamp,
    })

    await this.deps.relationships.save(relationship)
    return relationship
  }

  private ensureValidInput(input: CreateRelationshipInput): void {
    if (input.fromId.trim() === input.toId.trim()) {
      throw new ValidationError('Cannot create self-referencing relationship', {
        fromId: input.fromId,
        toId: input.toId,
      })
    }
  }

  private async ensureNotDuplicate(input: CreateRelationshipInput): Promise<void> {
    const existing = await this.deps.relationships.findBetween(
      input.fromId,
      input.toId,
      input.type,
    )

    if (existing) {
      throw new ValidationError('Relationship already exists', {
        relationshipId: existing.id,
      })
    }
  }
}
