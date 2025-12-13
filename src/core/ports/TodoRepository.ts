import type { Todo, TodoPriority, TodoStatus } from '@core/domain/Todo'

export type TodoSortField = 'priority' | 'createdAt' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

export type PriorityRange = Readonly<{
  min?: TodoPriority
  max?: TodoPriority
}>

export type ViewportFilter = Readonly<{
  x: { min: number; max: number }
  y: { min: number; max: number }
}>

export type ListTodosQuery = Readonly<{
  status?: TodoStatus | TodoStatus[]
  category?: string
  search?: string
  priorityRange?: PriorityRange
  viewport?: ViewportFilter
  limit?: number
  offset?: number
  sort?: Readonly<{ field: TodoSortField; direction?: SortDirection }>
}>

export interface TodoRepository {
  save(todo: Todo): Promise<void>
  findById(id: string): Promise<Todo | null>
  list(query?: ListTodosQuery): Promise<Todo[]>
  delete(id: string): Promise<void>
  deleteMany(ids: string[]): Promise<void>
}
