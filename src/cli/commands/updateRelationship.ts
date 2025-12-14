import type { Command } from 'commander'

import type { RelationshipType } from '@core/domain/Relationship'
import { ValidationError } from '@core/errors'
import type { UpdateRelationship } from '@core/usecases/UpdateRelationship'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { ALLOWED_RELATIONSHIP_TYPES } from '../constants'
import { serializeError, serializeRelationship } from '../serializers'

const RELATIONSHIP_TYPES: RelationshipType[] = [...ALLOWED_RELATIONSHIP_TYPES]

export type UpdateRelationshipDependencies = Readonly<{
  updateRelationship: Pick<UpdateRelationship, 'execute'>
}>

export type UpdateRelationshipOptions = {
  type?: string
  description?: string | null
}

export const registerUpdateRelationshipCommand = (
  program: Command,
  deps: UpdateRelationshipDependencies,
  io: CliIO,
): void => {
  program
    .command('relink')
    .description('Update relationship type or description')
    .argument('<id>', 'Relationship identifier to update')
    .option(
      '--type <value>',
      'Relationship type depends_on|blocks|related_to|parent_of',
    )
    .option('--description <text>', 'Description text (empty clears)')
    .action(async (id: string, options: UpdateRelationshipOptions) => {
      await handleUpdateRelationship(id, options, deps, io)
    })
}

const handleUpdateRelationship = async (
  id: string,
  options: UpdateRelationshipOptions,
  deps: UpdateRelationshipDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const payload = mapOptions(id, options)
    const relationship = await deps.updateRelationship.execute(payload)
    writeJson(io.stdout, {
      success: true,
      data: {
        relationship: serializeRelationship(relationship),
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

const mapOptions = (
  id: string,
  options: UpdateRelationshipOptions,
): Parameters<UpdateRelationship['execute']>[0] => {
  const type = parseOptionalType(options.type)
  return {
    id,
    type,
    description: options.description ?? undefined,
  }
}

const parseOptionalType = (raw?: string): RelationshipType | undefined => {
  if (raw === undefined) return undefined
  const normalized = raw.trim()
  if (!RELATIONSHIP_TYPES.includes(normalized as RelationshipType)) {
    throw new ValidationError('Relationship type must be depends_on|blocks|related_to|parent_of', {
      value: normalized,
    })
  }
  return normalized as RelationshipType
}
