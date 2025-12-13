import { Todo } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import type { Logger, TodoRepository } from '@core/ports'
import type { CanvasPosition, TodoPriority, TodoStatus } from '@core/domain/Todo'
import { NullLogger } from '@shared/logging'

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
  logger?: Logger
}>

export class CreateTodo {
  private readonly logger: Logger

  constructor(private readonly deps: CreateTodoDependencies) {
    this.logger = deps.logger ?? new NullLogger()
  }

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
    this.logCreation(todo)
    return todo
  }

  private ensureValidInput(input: CreateTodoInput): void {
    if (!input.title?.trim()) {
      throw new ValidationError('Title is required', { field: 'title' })
    }
  }

  private logCreation(todo: Todo): void {
    this.logger.info('todo.created', {
      todoId: todo.id,
      status: todo.status,
      priority: todo.priority,
      category: todo.category ?? 'uncategorized',
    })
  }
}
