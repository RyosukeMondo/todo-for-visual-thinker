import type { Command } from 'commander'

import type {
  CanvasPosition,
  TodoPriority,
  TodoStatus,
  Todo,
} from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import type { CreateTodo, ListTodos } from '@core/usecases'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError, serializeTodo } from '../serializers'
import { ALLOWED_STATUSES } from '../constants'

type AutoPositionPlanner = (existing: readonly Todo[]) => CanvasPosition

type AddTodoDependencies = Readonly<{
  createTodo: Pick<CreateTodo, 'execute'>
  listTodos: Pick<ListTodos, 'execute'>
  planPosition: AutoPositionPlanner
}>

type AddTodoOptions = {
  description?: string
  priority?: string
  category?: string
  color?: string
  icon?: string
  x?: string
  y?: string
  status?: string
}

const STATUS_VALUES: TodoStatus[] = [...ALLOWED_STATUSES]

export const registerAddTodoCommand = (
  program: Command,
  deps: AddTodoDependencies,
  io: CliIO,
): void => {
  program
    .command('add')
    .description('Create a new todo item')
    .argument('<title>', 'Title of the todo item')
    .option('-d, --description <text>', 'Optional description')
    .option('-p, --priority <1-5>', 'Priority level (1-5)')
    .option('-c, --category <name>', 'Category label for visual grouping')
    .option('--color <hex>', 'Hex color (e.g. #f97316)')
    .option('-i, --icon <name>', 'Icon identifier for quick scanning')
    .option('--x <number>', 'Canvas X position')
    .option('--y <number>', 'Canvas Y position')
    .option('--status <value>', 'Initial status (pending|in_progress|completed)')
    .action(async (title: string, options: AddTodoOptions) => {
      await handleAddAction(title, options, deps, io)
    })
}

const handleAddAction = async (
  title: string,
  options: AddTodoOptions,
  deps: AddTodoDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const payload = await mapInput(title, options, deps)
    const todo = await deps.createTodo.execute(payload)
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

const AUTO_POSITION_SAMPLE_LIMIT = 500

const mapInput = async (
  title: string,
  options: AddTodoOptions,
  deps: AddTodoDependencies,
): Promise<Parameters<CreateTodo['execute']>[0]> => {
  const priority = parseOptionalPriority(options.priority)
  const status = parseOptionalStatus(options.status)
  const position = await resolvePosition(buildPosition(options), deps)

  return {
    title,
    description: options.description,
    priority,
    category: options.category,
    color: options.color,
    icon: options.icon,
    position,
    status,
  }
}

const resolvePosition = async (
  explicit: Partial<CanvasPosition> | undefined,
  deps: AddTodoDependencies,
): Promise<Partial<CanvasPosition> | undefined> => {
  if (explicit) {
    return explicit
  }
  const existing = await deps.listTodos.execute({ limit: AUTO_POSITION_SAMPLE_LIMIT })
  return deps.planPosition(existing)
}

const parseOptionalPriority = (value?: string): TodoPriority | undefined => {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
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
  options: AddTodoOptions,
): Partial<CanvasPosition> | undefined => {
  const x = parseOptionalCoordinate(options.x, 'x')
  const y = parseOptionalCoordinate(options.y, 'y')
  if (x === undefined && y === undefined) {
    return undefined
  }
  const position: { x?: number; y?: number } = {}
  if (x !== undefined) position.x = x
  if (y !== undefined) position.y = y
  return position
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

export type { AddTodoDependencies }
