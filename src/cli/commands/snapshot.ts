import type { Command } from 'commander'

import type { GetBoardSnapshot } from '@core/usecases/GetBoardSnapshot'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError, serializeRelationship, serializeTodo } from '../serializers'
import { mapTodoFiltersToQuery } from './todoQueryOptions'
import type { TodoFilterOptions } from './todoQueryOptions'

export type SnapshotCommandDependencies = Readonly<{
  getBoardSnapshot: Pick<GetBoardSnapshot, 'execute'>
}>

export const registerSnapshotCommand = (
  program: Command,
  deps: SnapshotCommandDependencies,
  io: CliIO,
): void => {
  program
    .command('snapshot')
    .description('Render a machine-friendly snapshot of board tasks and viewport bounds')
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
    .action(async (options: SnapshotOptions) => {
      await handleSnapshotAction(options, deps, io)
    })
}

export type SnapshotOptions = TodoFilterOptions

const handleSnapshotAction = async (
  options: SnapshotOptions,
  deps: SnapshotCommandDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const query = mapTodoFiltersToQuery(options)
    const snapshot = await deps.getBoardSnapshot.execute(query)
    writeJson(io.stdout, {
      success: true,
      data: serializeSnapshot(snapshot),
    })
  } catch (error) {
    writeJson(io.stderr, {
      success: false,
      error: serializeError(error),
    })
    process.exitCode = 1
  }
}

const serializeSnapshot = (
  snapshot: Awaited<ReturnType<GetBoardSnapshot['execute']>>,
) => ({
  totals: snapshot.totals,
  viewport: snapshot.viewport,
  bounds: snapshot.bounds,
  tasks: snapshot.tasks.map((todo) => serializeTodo(todo)),
  relationships: snapshot.relationships.map((relationship) =>
    serializeRelationship(relationship),
  ),
})
