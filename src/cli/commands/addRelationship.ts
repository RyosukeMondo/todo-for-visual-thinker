import type { Command } from 'commander'

import type { CreateRelationship } from '@core/usecases'
import type { RelationshipType } from '@core/domain/Relationship'
import { ValidationError } from '@core/errors'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { ALLOWED_RELATIONSHIP_TYPES } from '../constants'
import { serializeError, serializeRelationship } from '../serializers'

export type AddRelationshipDependencies = Readonly<{
  createRelationship: Pick<CreateRelationship, 'execute'>
}>

export type AddRelationshipOptions = {
  type?: string
  description?: string
}

const RELATIONSHIP_TYPES: RelationshipType[] = [...ALLOWED_RELATIONSHIP_TYPES]

export const registerAddRelationshipCommand = (
  program: Command,
  deps: AddRelationshipDependencies,
  io: CliIO,
): void => {
  program
    .command('link')
    .description('Create a visual relationship between two todos')
    .argument('<fromId>', 'Source todo identifier')
    .argument('<toId>', 'Target todo identifier')
    .option(
      '--type <value>',
      'Relationship type depends_on|blocks|related_to|parent_of',
    )
    .option('-d, --description <text>', 'Optional relationship description')
    .action(async (fromId: string, toId: string, options: AddRelationshipOptions) => {
      await handleAddRelationshipAction(fromId, toId, options, deps, io)
    })
}

const handleAddRelationshipAction = async (
  fromId: string,
  toId: string,
  options: AddRelationshipOptions,
  deps: AddRelationshipDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const payload = mapInput(fromId, toId, options)
    const relationship = await deps.createRelationship.execute(payload)
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

const mapInput = (
  fromId: string,
  toId: string,
  options: AddRelationshipOptions,
): Parameters<CreateRelationship['execute']>[0] => {
  const type = parseType(options.type)
  const description = options.description?.trim()
  return {
    fromId,
    toId,
    type,
    description,
  }
}

const parseType = (raw?: string): RelationshipType => {
  const value = raw?.trim() ?? 'depends_on'
  if (!RELATIONSHIP_TYPES.includes(value as RelationshipType)) {
    throw new ValidationError('Relationship type must be depends_on|blocks|related_to|parent_of', {
      value,
    })
  }
  return value as RelationshipType
}
