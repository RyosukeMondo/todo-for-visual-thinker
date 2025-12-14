import type {
  CanvasPosition,
  TodoPriority,
  TodoStatus,
  VisualSize,
} from '@core/domain/Todo'

export type TodoDTO = Readonly<{
  id: string
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  category?: string
  color: string
  icon?: string
  position: CanvasPosition
  visualSize: VisualSize
  createdAt: string
  updatedAt: string
  completedAt?: string
}>

export type JsonError = Readonly<{
  code: string
  message: string
  context?: Record<string, unknown>
}>

export type CreateTodoRequestDTO = Readonly<{
  title: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  category?: string
  color?: string
  icon?: string
}>

export type CreateTodoResponseDTO = Readonly<{
  success: true
  data: Readonly<{
    todo: TodoDTO
  }>
}>

export type ApiErrorResponse = Readonly<{
  success: false
  error: JsonError
}>

export type CreateTodoResultDTO = CreateTodoResponseDTO | ApiErrorResponse
