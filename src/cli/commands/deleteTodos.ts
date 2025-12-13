import type { Command } from 'commander'

import type { DeleteTodo } from '@core/usecases'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError } from '../serializers'

type DeleteTodosDependencies = Readonly<{
  deleteTodo: Pick<DeleteTodo, 'execute'>
}>

export const registerDeleteTodosCommand = (
  program: Command,
  deps: DeleteTodosDependencies,
  io: CliIO,
): void => {
  program
    .command('delete')
    .description('Delete one or many todos by id for clean visual space')
    .argument('<ids...>', 'Todo identifiers to delete (space separated)')
    .action(async (ids: string[]) => {
      await handleDeleteAction(ids, deps, io)
    })
}

const handleDeleteAction = async (
  ids: string[],
  deps: DeleteTodosDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const payload = mapIdsToPayload(ids)
    await deps.deleteTodo.execute(payload)
    writeJson(io.stdout, {
      success: true,
      data: {
        deletedCount: payload.ids.length,
        ids: payload.ids,
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

const mapIdsToPayload = (
  ids: string[],
): Parameters<DeleteTodo['execute']>[0] => {
  const normalized = ids
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .filter((id, index, arr) => arr.indexOf(id) === index)
  return {
    ids: normalized,
  }
}

export type { DeleteTodosDependencies }
