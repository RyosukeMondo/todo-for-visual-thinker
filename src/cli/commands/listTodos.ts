import type { Command } from 'commander'

import type { TodoPriority, TodoStatus } from '@core/domain/Todo'
import { ValidationError } from '@core/errors'
import type { ListTodos } from '@core/usecases'
import type { TodoSortField } from '@core/ports'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError, serializeTodo } from '../serializers'
import { ALLOWED_SORT_FIELDS, ALLOWED_STATUSES } from '../constants'

const STATUS_VALUES: TodoStatus[] = [...ALLOWED_STATUSES]
const SORT_FIELDS: TodoSortField[] = [...ALLOWED_SORT_FIELDS]

export type ListTodosDependencies = Readonly<{
  listTodos: Pick<ListTodos, 'execute'>
}>

export type ListTodosOptions = {
  status?: string[]
  category?: string
  search?: string
  priorityMin?: string
  priorityMax?: string
  limit?: string
  offset?: string
  sort?: string
  direction?: string
  xMin?: string
  xMax?: string
  yMin?: string
  yMax?: string
}

export const registerListTodosCommand = (
  program: Command,
  deps: ListTodosDependencies,
  io: CliIO,
): void => {
  program
    .command('list')
    .description('List todos with visual-first filtering options')
    .option('-s, --status <status...>', 'Filter by status (repeatable)')
    .option('-c, --category <name>', 'Filter by category label')
    .option('-q, --search <text>', 'Free text search across title/description')
    .option('--priority-min <1-5>', 'Minimum priority inclusive')
    .option('--priority-max <1-5>', 'Maximum priority inclusive')
    .option('--limit <number>', 'Maximum results to return (default 100)')
    .option('--offset <number>', 'Skip a number of results (default 0)')
    .option('--sort <field>', 'Sort by priority|createdAt|updatedAt')
    .option('--direction <dir>', 'Sort direction asc|desc (default asc)')
    .option('--x-min <number>', 'Viewport X min bound')
    .option('--x-max <number>', 'Viewport X max bound')
    .option('--y-min <number>', 'Viewport Y min bound')
    .option('--y-max <number>', 'Viewport Y max bound')
    .action(async (options: ListTodosOptions) => {
      await handleListAction(options, deps, io)
    })
}

const handleListAction = async (
  options: ListTodosOptions,
  deps: ListTodosDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const query = mapOptionsToQuery(options)
    const todos = await deps.listTodos.execute(query)
    writeJson(io.stdout, {
      success: true,
      data: {
        todos: todos.map(serializeTodo),
        filters: query,
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

const mapOptionsToQuery = (
  options: ListTodosOptions,
): Parameters<ListTodos['execute']>[0] => {
  const status = parseStatuses(options.status)
  const priorityRange = buildPriorityRange(options)
  const limit = parseOptionalPositiveInt(options.limit, 'limit')
  const offset = parseOptionalNonNegativeInt(options.offset, 'offset')
  const viewport = buildViewport(options)
  const sort = buildSort(options)

  return {
    status,
    category: options.category,
    search: options.search,
    priorityRange,
    limit,
    offset,
    viewport,
    sort,
  }
}

const parseStatuses = (
  values?: string[],
): TodoStatus | TodoStatus[] | undefined => {
  if (!values || values.length === 0) return undefined
  const normalized = values.map((value) => value.trim()).filter(Boolean)
  if (normalized.length === 0) {
    throw new ValidationError('At least one valid status must be provided', {
      values,
    })
  }
  normalized.forEach((value) => {
    if (!STATUS_VALUES.includes(value as TodoStatus)) {
      throw new ValidationError('Unknown status filter provided', {
        value,
        allowed: STATUS_VALUES,
      })
    }
  })
  return normalized.length === 1
    ? (normalized[0] as TodoStatus)
    : (normalized as TodoStatus[])
}

const buildPriorityRange = (
  options: ListTodosOptions,
): { min?: TodoPriority; max?: TodoPriority } | undefined => {
  const min = parseOptionalPriorityBound(options.priorityMin, 'min')
  const max = parseOptionalPriorityBound(options.priorityMax, 'max')
  if (min === undefined && max === undefined) {
    return undefined
  }
  return { min, max }
}

const parseOptionalPriorityBound = (
  raw: string | undefined,
  bound: 'min' | 'max',
): TodoPriority | undefined => {
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed)) {
    throw new ValidationError('Priority bounds must be integers', {
      bound,
      raw,
    })
  }
  if (parsed < 1 || parsed > 5) {
    throw new ValidationError('Priority bounds must be between 1 and 5', {
      bound,
      raw,
    })
  }
  return parsed as TodoPriority
}

const parseOptionalPositiveInt = (
  raw: string | undefined,
  field: 'limit',
): number | undefined => {
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError(`${field} must be a positive integer`, {
      field,
      raw,
    })
  }
  return parsed
}

const parseOptionalNonNegativeInt = (
  raw: string | undefined,
  field: 'offset',
): number | undefined => {
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(`${field} must be zero or a positive integer`, {
      field,
      raw,
    })
  }
  return parsed
}

const buildViewport = (
  options: ListTodosOptions,
):
  | {
      x: { min: number; max: number }
      y: { min: number; max: number }
    }
  | undefined => {
  const x = buildAxisRange('x', options.xMin, options.xMax)
  const y = buildAxisRange('y', options.yMin, options.yMax)
  if (!x && !y) return undefined
  if (!x || !y) {
    throw new ValidationError('Both X and Y viewport bounds must be provided', {
      x,
      y,
    })
  }
  return { x, y }
}

const buildAxisRange = (
  axis: 'x' | 'y',
  minRaw?: string,
  maxRaw?: string,
): { min: number; max: number } | undefined => {
  if (minRaw === undefined && maxRaw === undefined) return undefined
  if (minRaw === undefined || maxRaw === undefined) {
    throw new ValidationError(`Viewport ${axis} bounds require both min and max`, {
      axis,
    })
  }
  const min = parseFiniteNumber(minRaw, `${axis}Min`)
  const max = parseFiniteNumber(maxRaw, `${axis}Max`)
  return { min, max }
}

const parseFiniteNumber = (raw: string, field: string): number => {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${field} must be a finite number`, {
      field,
      raw,
    })
  }
  return parsed
}

const buildSort = (
  options: ListTodosOptions,
): { field: TodoSortField; direction?: 'asc' | 'desc' } | undefined => {
  if (!options.sort) return undefined
  if (!SORT_FIELDS.includes(options.sort as TodoSortField)) {
    throw new ValidationError('Unknown sort field requested', {
      sort: options.sort,
      allowed: SORT_FIELDS,
    })
  }
  const direction = parseOptionalSortDirection(options.direction)
  return {
    field: options.sort as TodoSortField,
    direction,
  }
}

const parseOptionalSortDirection = (
  raw?: string,
): 'asc' | 'desc' | undefined => {
  if (!raw) return undefined
  if (raw !== 'asc' && raw !== 'desc') {
    throw new ValidationError('Sort direction must be asc or desc', {
      raw,
    })
  }
  return raw
}
