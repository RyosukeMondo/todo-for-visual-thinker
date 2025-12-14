import type { UpdateTodo } from '@core/usecases/UpdateTodo'
import type { UpdateTodoRequestDTO } from '@shared/types/api'

export type UpdateTodoControllerDependencies = Readonly<{
  updateTodo: Pick<UpdateTodo, 'execute'>
}>

export class UpdateTodoController {
  constructor(private readonly deps: UpdateTodoControllerDependencies) {}

  async handle(payload: UpdateTodoRequestDTO & { id: string }) {
    return this.deps.updateTodo.execute(payload)
  }
}
