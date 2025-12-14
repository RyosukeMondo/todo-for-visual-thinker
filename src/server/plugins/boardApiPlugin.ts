import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

import { createRuntime } from '@cli/runtime'
import { serializeError, serializeTodo } from '@cli/serializers'
import type {
  CreateTodoRequestDTO,
  CreateTodoResultDTO,
  UpdateTodoRequestDTO,
  UpdateTodoResultDTO,
} from '@shared/types/api'
import type { CanvasPosition, TodoPriority, TodoStatus } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import { SnapshotPresenter } from '@server/presenters/SnapshotPresenter'
import { BoardStatusPresenter } from '@server/presenters/BoardStatusPresenter'
import { CreateTodoController } from '@server/controllers/CreateTodoController'
import { UpdateTodoController } from '@server/controllers/UpdateTodoController'
import { planSpiralPosition } from '@server/placement/SpiralPositionPlanner'

export const boardApiPlugin = (): Plugin => ({
  name: 'board-api-plugin',
  configureServer(server) {
    const context = createServerContext()
    server.middlewares.use('/api/status', context.handleStatus)
    server.middlewares.use('/api/board', context.handleSnapshot)
    server.middlewares.use('/api/todos', context.handleCreate)
    server.middlewares.use('/api/todos/', context.handleUpdate)
    server.httpServer?.once('close', context.shutdown)
  },
})

const createServerContext = () => {
  const runtime = createRuntime()
  const presenter = new SnapshotPresenter()
  const statusPresenter = new BoardStatusPresenter()
  const createController = new CreateTodoController({
    createTodo: runtime.createTodo,
    listTodos: runtime.listTodos,
    planPosition: planSpiralPosition,
  })
  const updateController = new UpdateTodoController({
    updateTodo: runtime.updateTodo,
  })

  return {
    handleSnapshot: async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') {
        respondStatusError(res, 'METHOD_NOT_ALLOWED', 'Only GET supported', 405)
        return
      }
      await handleBoardSnapshot(res, runtime, presenter)
    },
    handleStatus: async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') {
        respondStatusError(res, 'METHOD_NOT_ALLOWED', 'Only GET supported', 405)
        return
      }
      await handleBoardStatus(res, runtime, statusPresenter)
    },
    handleCreate: async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') {
        respondJson(res, 405, {
          success: false,
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST supported' },
        })
        return
      }
      await handleCreateTodo(req, res, createController)
    },
    handleUpdate: async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const todoId = extractTodoId(req.url)
      if (!todoId) {
        next()
        return
      }
      if (req.method !== 'PATCH') {
        respondJson(res, 405, {
          success: false,
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Only PATCH supported' },
        } satisfies UpdateTodoResultDTO)
        return
      }
      await handleUpdateTodo(req, res, todoId, updateController)
    },
    shutdown: () => runtime.shutdown(),
  }
}

const extractTodoId = (url?: string | null): string | undefined => {
  if (!url) return undefined
  const match = /^\/([^/?#]+)/.exec(url)
  return match?.[1]
}

const handleBoardSnapshot = async (
  res: ServerResponse,
  runtime: ReturnType<typeof createRuntime>,
  presenter: SnapshotPresenter,
): Promise<void> => {
  try {
    const snapshot = await runtime.getBoardSnapshot.execute()
    const payload = presenter.present(snapshot)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  } catch (error) {
    console.error('Board API error', error)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'BOARD_SNAPSHOT_FAILED' }))
  }
}

const handleBoardStatus = async (
  res: ServerResponse,
  runtime: ReturnType<typeof createRuntime>,
  presenter: BoardStatusPresenter,
): Promise<void> => {
  try {
    const snapshot = await runtime.getBoardStatus.execute()
    const payload = presenter.present(snapshot)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  } catch (error) {
    console.error('Board status API error', error)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'BOARD_STATUS_FAILED' }))
  }
}

const handleCreateTodo = async (
  req: IncomingMessage,
  res: ServerResponse,
  controller: CreateTodoController,
): Promise<void> => {
  try {
    const body = await readJsonBody(req)
    const payload = mapCreateTodoPayload(body)
    const todo = await controller.handle(payload)
    respondJson(res, 201, {
      success: true,
      data: { todo: serializeTodo(todo) },
    } satisfies CreateTodoResultDTO)
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : 500
    console.error('Create todo API error', error)
    respondJson(res, status, {
      success: false,
      error: serializeError(error),
    } satisfies CreateTodoResultDTO)
  }
}

const handleUpdateTodo = async (
  req: IncomingMessage,
  res: ServerResponse,
  todoId: string,
  controller: UpdateTodoController,
): Promise<void> => {
  try {
    const body = await readJsonBody(req)
    const payload = mapUpdateTodoPayload(todoId, body)
    const todo = await controller.handle(payload)
    respondJson(res, 200, {
      success: true,
      data: { todo: serializeTodo(todo) },
    } satisfies UpdateTodoResultDTO)
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : 500
    console.error('Update todo API error', error)
    respondJson(res, status, {
      success: false,
      error: serializeError(error),
    } satisfies UpdateTodoResultDTO)
  }
}

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  return await new Promise((resolve, reject) => {
    let buffer = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      buffer += chunk
    })
    req.on('end', () => {
      if (!buffer) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(buffer))
      } catch (error) {
        reject(new ValidationError('Invalid JSON payload', { error }))
      }
    })
    req.on('error', reject)
  })
}

const respondJson = (
  res: ServerResponse,
  statusCode: number,
  payload: CreateTodoResultDTO | UpdateTodoResultDTO,
): void => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const mapCreateTodoPayload = (body: unknown): CreateTodoRequestDTO => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Payload must be an object')
  }
  const record = body as Record<string, unknown>
  const title = normalizeText(record.title, 'title')
  if (!title) {
    throw new ValidationError('Title is required')
  }

  return {
    title,
    description: normalizeOptionalText(record.description),
    category: normalizeOptionalText(record.category),
    color: normalizeOptionalText(record.color),
    icon: normalizeOptionalText(record.icon),
    status: parseOptionalStatus(record.status),
    priority: parseOptionalPriority(record.priority),
  }
}

const respondStatusError = (
  res: ServerResponse,
  code: string,
  message: string,
  status: number,
): void => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ success: false, error: { code, message } }))
}

const mapUpdateTodoPayload = (
  id: string,
  body: unknown,
): UpdateTodoRequestDTO & { id: string } => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Payload must be an object')
  }
  const record = body as Record<string, unknown>
  return {
    id,
    title: normalizeOptionalText(record.title),
    description: normalizeOptionalNullableText(record.description),
    category: normalizeOptionalNullableText(record.category),
    color: normalizeOptionalText(record.color),
    icon: normalizeOptionalNullableText(record.icon),
    priority: parseOptionalPriority(record.priority),
    status: parseOptionalStatus(record.status),
    position: mapOptionalPosition(record.position),
  }
}

const normalizeOptionalNullableText = (
  value: unknown,
): string | null | undefined => {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const mapOptionalPosition = (
  value: unknown,
): Partial<CanvasPosition> | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const x = parseOptionalCoordinate(record.x, 'x')
  const y = parseOptionalCoordinate(record.y, 'y')
  if (x === undefined && y === undefined) {
    return undefined
  }
  const position: Partial<CanvasPosition> = {}
  if (x !== undefined) position.x = x
  if (y !== undefined) position.y = y
  return position
}

const normalizeText = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new ValidationError(`Field ${field} must be a string`, { field })
  }
  return value.trim()
}

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const parseOptionalPriority = (
  value: unknown,
): TodoPriority | undefined => {
  if (value === undefined || value === null) return undefined
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new ValidationError('Priority must be an integer', { value })
  }
  if (parsed < 1 || parsed > 5) {
    throw new ValidationError('Priority must be between 1 and 5', { value })
  }
  return parsed as TodoPriority
}

const parseOptionalStatus = (value: unknown): TodoStatus | undefined => {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw new ValidationError('Status must be a string', { value })
  }
  const trimmed = value.trim() as TodoStatus
  if (!ALLOWED_STATUSES.includes(trimmed)) {
    throw new ValidationError('Status must be pending, in_progress, or completed', {
      value,
    })
  }
  return trimmed
}

const ALLOWED_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed']

const parseOptionalCoordinate = (
  value: unknown,
  field: string,
): number | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }
  const parsed =
    typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed)) {
    throw new ValidationError('Coordinate must be a finite number', {
      field,
      value,
    })
  }
  return parsed
}
