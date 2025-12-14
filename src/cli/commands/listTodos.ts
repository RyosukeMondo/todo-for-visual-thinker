import type { Command } from 'commander'

import type { ListTodos } from '@core/usecases'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError, serializeTodo } from '../serializers'
import { formatTodoList } from '../output/formatTodoList'
import { mapTodoFiltersToQuery } from './todoQueryOptions'
import type { TodoFilterOptions } from './todoQueryOptions'

export type ListTodosDependencies = Readonly<{
  listTodos: Pick<ListTodos, 'execute'>
}>

export type ListTodosOptions = TodoFilterOptions & {
  pretty?: boolean
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
    .option('--pretty', 'Render human-readable summary instead of JSON', false)
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
    const query = mapTodoFiltersToQuery(options)
    const todos = await deps.listTodos.execute(query)
    const serialized = todos.map(serializeTodo)
    if (options.pretty) {
      io.stdout.write(formatTodoList(serialized))
      return
    }
    writeJson(io.stdout, {
      success: true,
      data: {
        todos: serialized,
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
