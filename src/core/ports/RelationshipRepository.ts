import type {
  Relationship,
  RelationshipType,
} from '@core/domain/Relationship'

export type RelationshipQuery = Readonly<{
  fromId?: string
  toId?: string
  type?: RelationshipType | RelationshipType[]
  involving?: string
  limit?: number
  offset?: number
}>

export interface RelationshipRepository {
  save(relationship: Relationship): Promise<void>
  findById(id: string): Promise<Relationship | null>
  findBetween(
    fromId: string,
    toId: string,
    type?: RelationshipType,
  ): Promise<Relationship | null>
  list(query?: RelationshipQuery): Promise<Relationship[]>
  delete(id: string): Promise<void>
  deleteByTodoId(todoId: string): Promise<void>
}

export type { Relationship }
