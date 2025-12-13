import { Todo } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import type { TodoRepository } from '@core/ports'
import type { CanvasPosition, TodoPriority, TodoStatus } from '@core/domain/Todo'

export type CreateTodoInput = Readonly<{
  title: string
  description?: string
  priority?: TodoPriority
  category?: string
  color?: string
  icon?: string
  position?: Partial<CanvasPosition>
  status?: TodoStatus
}>

export type CreateTodoDependencies = Readonly<{
  repository: TodoRepository
  idGenerator: () => string
  clock?: () => Date
}>

export class CreateTodo {
  constructor(private readonly deps: CreateTodoDependencies) {}

  async execute(input: CreateTodoInput): Promise<Todo> {
    this.ensureValidInput(input)
    const todo = Todo.create({
      id: this.deps.idGenerator(),
      title: input.title,
      description: input.description,
      priority: input.priority,
      category: input.category,
      color: input.color,
      icon: input.icon,
      position: input.position,
      status: input.status,
      createdAt: this.deps.clock?.() ?? new Date(),
    })

    await this.deps.repository.save(todo)
    return todo
  }

  private ensureValidInput(input: CreateTodoInput): void {
    if (!input.title?.trim()) {
      throw new ValidationError('Title is required', { field: 'title' })
    }
  }
}
