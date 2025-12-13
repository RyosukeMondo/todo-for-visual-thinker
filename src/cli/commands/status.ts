import type { Command } from 'commander'

import type { GetBoardStatus } from '@core/usecases'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError } from '../serializers'

export type StatusCommandDependencies = Readonly<{
  getBoardStatus: Pick<GetBoardStatus, 'execute'>
}>

export const registerStatusCommand = (
  program: Command,
  deps: StatusCommandDependencies,
  io: CliIO,
): void => {
  program
    .command('status')
    .description('Show a snapshot of the board health and visual distribution')
    .action(() => handleStatusAction(deps, io))
}

const handleStatusAction = async (
  deps: StatusCommandDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const snapshot = await deps.getBoardStatus.execute()
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
  snapshot: Awaited<ReturnType<GetBoardStatus['execute']>>,
) => ({
  meta: {
    total: snapshot.total,
    active: snapshot.active,
    completed: snapshot.completed,
    completionRate: Number(snapshot.completionRate.toFixed(4)),
    lastUpdatedAt: snapshot.lastUpdatedAt?.toISOString(),
    lastCreatedAt: snapshot.lastCreatedAt?.toISOString(),
  },
  statuses: snapshot.statuses,
  priorities: snapshot.priorities,
  categories: snapshot.categories,
})
