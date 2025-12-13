import type { Command } from 'commander'

import type { DeleteRelationship } from '@core/usecases/DeleteRelationship'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError } from '../serializers'

export type DeleteRelationshipsDependencies = Readonly<{
  deleteRelationship: Pick<DeleteRelationship, 'execute'>
}>

export const registerDeleteRelationshipsCommand = (
  program: Command,
  deps: DeleteRelationshipsDependencies,
  io: CliIO,
): void => {
  program
    .command('unlink')
    .description('Remove visual relationships between todos')
    .argument('<ids...>', 'Relationship identifiers to remove')
    .action(async (ids: string[]) => {
      await handleDeleteRelationships(ids, deps, io)
    })
}

const handleDeleteRelationships = async (
  ids: string[],
  deps: DeleteRelationshipsDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const payload = mapIdsToPayload(ids)
    await deps.deleteRelationship.execute(payload)
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
): Parameters<DeleteRelationship['execute']>[0] => {
  const normalized = ids
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value, index, arr) => arr.indexOf(value) === index)
  return {
    ids: normalized,
  }
}

