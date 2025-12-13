import type { Command } from 'commander'

import type { TodoPriority, TodoStatus } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import type { UpdateTodo } from '@core/usecases'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { ALLOWED_STATUSES } from '../constants'
import { serializeError, serializeTodo } from '../serializers'

const STATUS_VALUES: TodoStatus[] = [...ALLOWED_STATUSES]

export type UpdateTodoDependencies = Readonly<{
  updateTodo: Pick<UpdateTodo, 'execute'>
}>

export type UpdateTodoOptions = {
  title?: string
  description?: string | null
  priority?: string
  category?: string | null
  color?: string
  icon?: string | null
  x?: string
  y?: string
  status?: string
}

export const registerUpdateTodoCommand = (
  program: Command,
  deps: UpdateTodoDependencies,
  io: CliIO,
): void => {
  program
    .command('update')
    .description('Update properties of an existing todo item')
    .argument('<id>', 'Identifier of the todo to update')
    .option('--title <text>', 'New title for the todo')
    .option('--description <text>', 'New description (empty to clear)')
    .option('--priority <1-5>', 'Priority level (1-5)')
    .option('--category <name>', 'Category label (empty to clear)')
    .option('--color <hex>', 'Hex color (e.g. #2563eb)')
    .option('--icon <name>', 'Icon token (empty to clear)')
    .option('--x <number>', 'Canvas X position')
    .option('--y <number>', 'Canvas Y position')
    .option('--status <value>', 'Status pending|in_progress|completed')
    .action(async (id: string, options: UpdateTodoOptions) => {
      await handleUpdateAction(id, options, deps, io)
    })
}

const handleUpdateAction = async (
  id: string,
  options: UpdateTodoOptions,
  deps: UpdateTodoDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const payload = mapInput(id, options)
    const todo = await deps.updateTodo.execute(payload)
    writeJson(io.stdout, {
      success: true,
      data: {
        todo: serializeTodo(todo),
      },
    })
  } catch (error) {
    writeJson(io.stderr, {
      success: false,
      error: serializeError(error),
    })
    process.exitCode = 1
  }
}

const mapInput = (
  id: string,
  options: UpdateTodoOptions,
): Parameters<UpdateTodo['execute']>[0] => {
  const priority = parseOptionalPriority(options.priority)
  const position = buildPosition(options)
  const status = parseOptionalStatus(options.status)

  return {
    id,
    title: options.title,
    description: options.description ?? undefined,
    priority,
    category: options.category ?? undefined,
    color: options.color,
    icon: options.icon ?? undefined,
    position,
    status,
  }
}

const parseOptionalPriority = (value?: string): TodoPriority | undefined => {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    throw new ValidationError('Priority must be an integer between 1 and 5', {
      value,
    })
  }
  if (parsed < 1 || parsed > 5) {
    throw new ValidationError('Priority must be between 1 and 5', { value })
  }
  return parsed as TodoPriority
}

const buildPosition = (
  options: UpdateTodoOptions,
): { x?: number; y?: number } | undefined => {
  const x = parseOptionalCoordinate(options.x, 'x')
  const y = parseOptionalCoordinate(options.y, 'y')
  if (x === undefined && y === undefined) {
    return undefined
  }
  const target: { x?: number; y?: number } = {}
  if (x !== undefined) target.x = x
  if (y !== undefined) target.y = y
  return target
}

const parseOptionalCoordinate = (
  value: string | undefined,
  field: string,
): number | undefined => {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new ValidationError('Coordinate must be a finite number', {
      field,
      value,
    })
  }
  return parsed
}

const parseOptionalStatus = (value?: string): TodoStatus | undefined => {
  if (!value) return undefined
  if (!STATUS_VALUES.includes(value as TodoStatus)) {
    throw new ValidationError('Status must be pending, in_progress, or completed', {
      value,
    })
  }
  return value as TodoStatus
}
