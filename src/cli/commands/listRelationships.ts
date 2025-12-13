import type { Command } from 'commander'

import type { RelationshipType } from '@core/domain/Relationship'
import { ValidationError } from '@core/errors'
import type { ListRelationships } from '@core/usecases/ListRelationships'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { ALLOWED_RELATIONSHIP_TYPES } from '../constants'
import { serializeError, serializeRelationship } from '../serializers'

const RELATIONSHIP_TYPES: RelationshipType[] = [...ALLOWED_RELATIONSHIP_TYPES]

export type ListRelationshipsDependencies = Readonly<{
  listRelationships: Pick<ListRelationships, 'execute'>
}>

export type ListRelationshipsOptions = {
  from?: string
  to?: string
  involving?: string
  type?: string[]
  limit?: string
  offset?: string
}

export const registerListRelationshipsCommand = (
  program: Command,
  deps: ListRelationshipsDependencies,
  io: CliIO,
): void => {
  program
    .command('links')
    .description('List relationship links connecting todos')
    .option('--from <id>', 'Filter by source todo id')
    .option('--to <id>', 'Filter by target todo id')
    .option('--involving <id>', 'Filter links touching a todo id')
    .option('--type <type...>', 'Filter by relationship types')
    .option('--limit <number>', 'Maximum relationships to return')
    .option('--offset <number>', 'Number of relationships to skip')
    .action(async (options: ListRelationshipsOptions) => {
      await handleListRelationships(options, deps, io)
    })
}

const handleListRelationships = async (
  options: ListRelationshipsOptions,
  deps: ListRelationshipsDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const query = mapOptionsToQuery(options)
    const relationships = await deps.listRelationships.execute(query)
    writeJson(io.stdout, {
      success: true,
      data: {
        relationships: relationships.map(serializeRelationship),
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
  options: ListRelationshipsOptions,
): Parameters<ListRelationships['execute']>[0] => ({
  fromId: options.from,
  toId: options.to,
  involving: options.involving,
  type: parseTypes(options.type),
  limit: parseOptionalPositiveInt(options.limit),
  offset: parseOptionalNonNegativeInt(options.offset),
})

const parseTypes = (
  values?: string[],
): RelationshipType | RelationshipType[] | undefined => {
  if (!values || values.length === 0) {
    return undefined
  }
  const normalized = values.map((value) => value.trim()).filter(Boolean)
  if (normalized.length === 0) {
    throw new ValidationError('Relationship type requires at least one value')
  }
  normalized.forEach((value) => {
    if (!RELATIONSHIP_TYPES.includes(value as RelationshipType)) {
      throw new ValidationError('Unknown relationship type filter', {
        value,
        allowed: RELATIONSHIP_TYPES,
      })
    }
  })
  return normalized.length === 1
    ? (normalized[0] as RelationshipType)
    : (normalized as RelationshipType[])
}

const parseOptionalPositiveInt = (raw?: string): number | undefined => {
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError('Limit must be a positive integer', {
      value: raw,
    })
  }
  return parsed
}

const parseOptionalNonNegativeInt = (raw?: string): number | undefined => {
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError('Offset must be zero or a positive integer', {
      value: raw,
    })
  }
  return parsed
}
