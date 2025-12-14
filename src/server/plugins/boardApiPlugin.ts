import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

import { createRuntime } from '@cli/runtime'
import { serializeError, serializeTodo } from '@cli/serializers'
import type {
  CreateTodoRequestDTO,
  CreateTodoResultDTO,
} from '@shared/types/api'
import type { TodoPriority, TodoStatus } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import { SnapshotPresenter } from '@server/presenters/SnapshotPresenter'
import { CreateTodoController } from '@server/controllers/CreateTodoController'
import { planSpiralPosition } from '@server/placement/SpiralPositionPlanner'

export const boardApiPlugin = (): Plugin => {
  return {
    name: 'board-api-plugin',
    configureServer(server) {
      const runtime = createRuntime()
      const presenter = new SnapshotPresenter()
      const controller = new CreateTodoController({
        createTodo: runtime.createTodo,
        listTodos: runtime.listTodos,
        planPosition: planSpiralPosition,
      })

      server.middlewares.use('/api/board', async (_req, res) => {
        await handleBoardSnapshot(res, runtime, presenter)
      })

      server.middlewares.use('/api/todos', async (req, res) => {
        if (req.method !== 'POST') {
          respondJson(res, 405, {
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST supported' },
          })
          return
        }
        await handleCreateTodo(req, res, controller)
      })

      server.httpServer?.once('close', () => runtime.shutdown())
    },
  }
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
    })
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : 500
    console.error('Create todo API error', error)
    respondJson(res, status, {
      success: false,
      error: serializeError(error),
    })
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
  payload: CreateTodoResultDTO,
): void => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload satisfies CreateTodoResultDTO))
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
