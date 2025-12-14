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

const DIRECTIONAL_RELATIONSHIP_TYPES = ['depends_on', 'blocks', 'parent_of'] as const
const RELATIONSHIP_TRAVERSAL_LIMIT = 5_000

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
    await this.ensureNoCircularDependency(input)

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

  private async ensureNoCircularDependency(
    input: CreateRelationshipInput,
  ): Promise<void> {
    if (!this.isDirectionalType(input.type)) {
      return
    }

    const targetId = input.fromId.trim()
    const traversalStack = [input.toId.trim()]
    const visited = new Set<string>()

    while (traversalStack.length > 0) {
      const current = traversalStack.pop()
      if (!current || visited.has(current)) {
        continue
      }
      if (current === targetId) {
        throw new ValidationError('Relationship would create a circular dependency', {
          fromId: input.fromId,
          toId: input.toId,
          type: input.type,
        })
      }

      visited.add(current)
      if (visited.size > RELATIONSHIP_TRAVERSAL_LIMIT) {
        throw new ValidationError('Circular dependency detection exceeded traversal limit', {
          limit: RELATIONSHIP_TRAVERSAL_LIMIT,
        })
      }
      const neighbors = (await this.deps.relationships.list({
        fromId: current,
        type: [...DIRECTIONAL_RELATIONSHIP_TYPES],
        limit: RELATIONSHIP_TRAVERSAL_LIMIT,
      })) ?? []

      neighbors.forEach((edge) => {
        traversalStack.push(edge.toId)
      })
    }
  }

  private isDirectionalType(type: Relationship['type']): boolean {
    return (DIRECTIONAL_RELATIONSHIP_TYPES as readonly string[]).includes(type)
  }
}
