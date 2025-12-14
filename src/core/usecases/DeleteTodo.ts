import { TodoNotFoundError, ValidationError } from '@core/errors'
import type {
  RelationshipRepository,
  TodoRepository,
} from '@core/ports'

type RelationshipCleanupPort = Pick<RelationshipRepository, 'deleteByTodoId'>

export type DeleteTodoDependencies = Readonly<{
  repository: TodoRepository
  relationships: RelationshipCleanupPort
}>

export type DeleteTodoInput = Readonly<{
  ids: string | string[]
}>

export class DeleteTodo {
  constructor(private readonly deps: DeleteTodoDependencies) {}

  async execute(input: DeleteTodoInput): Promise<void> {
    const identifiers = this.normalizeIds(input.ids)
    if (identifiers.length === 0) {
      throw new ValidationError('At least one todo id must be provided', {
        ids: input.ids,
      })
    }

    if (identifiers.length === 1) {
      const [singleId] = identifiers
      if (!singleId) {
        throw new ValidationError('Unexpected empty todo identifier set')
      }
      await this.deleteSingle(singleId)
      return
    }

    await this.deleteMany(identifiers)
  }

  private async deleteSingle(id: string): Promise<void> {
    const todo = await this.deps.repository.findById(id)
    if (!todo) {
      throw new TodoNotFoundError(id)
    }
    await Promise.all([
      this.deps.repository.delete(id),
      this.deps.relationships.deleteByTodoId(id),
    ])
  }

  private async deleteMany(ids: string[]): Promise<void> {
    const todos = await Promise.all(ids.map((id) => this.deps.repository.findById(id)))
    const missing = ids.filter((_, index) => !todos[index])
    if (missing.length > 0) {
      throw new TodoNotFoundError(missing)
    }
    await this.deps.repository.deleteMany(ids)
    await Promise.all(
      ids.map((id) => this.deps.relationships.deleteByTodoId(id)),
    )
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
