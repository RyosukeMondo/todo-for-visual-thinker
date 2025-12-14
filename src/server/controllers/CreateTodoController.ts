import type { CanvasPosition, Todo } from '@core/domain/Todo'
import type { CreateTodo } from '@core/usecases/CreateTodo'
import type { ListTodos } from '@core/usecases/ListTodos'

export type CreateTodoControllerInput = Readonly<Parameters<CreateTodo['execute']>[0]>

export type CreateTodoControllerDependencies = Readonly<{
  createTodo: Pick<CreateTodo, 'execute'>
  listTodos: Pick<ListTodos, 'execute'>
  planPosition: (existing: readonly Todo[]) => CanvasPosition
}>

const AUTO_POSITION_LIMIT = 500

export class CreateTodoController {
  constructor(private readonly deps: CreateTodoControllerDependencies) {}

  async handle(input: CreateTodoControllerInput) {
    const position = await this.resolvePosition(input.position)
    return this.deps.createTodo.execute({ ...input, position })
  }

  private async resolvePosition(
    position?: Partial<CanvasPosition>,
  ): Promise<Partial<CanvasPosition>> {
    if (this.hasExplicitPosition(position)) {
      return position ?? {}
    }
    const existing = await this.deps.listTodos.execute({ limit: AUTO_POSITION_LIMIT })
    return this.deps.planPosition(existing)
  }

  private hasExplicitPosition(position?: Partial<CanvasPosition>): boolean {
    if (!position) return false
    return (
      (typeof position.x === 'number' && Number.isFinite(position.x)) ||
      (typeof position.y === 'number' && Number.isFinite(position.y))
    )
  }
}
