import type { Command } from 'commander'

import type { ListCategories } from '@core/usecases'
import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeCategory, serializeError } from '../serializers'
import { ValidationError } from '@core/errors'

type ListCategoriesDependencies = Readonly<{
  listCategories: Pick<ListCategories, 'execute'>
}>

type ListCategoriesOptions = Readonly<{
  search?: string
  limit?: string
  offset?: string
}>

export const registerListCategoriesCommand = (
  program: Command,
  deps: ListCategoriesDependencies,
  io: CliIO,
): void => {
  program
    .command('category:list')
    .description('List visual categories')
    .option('--search <text>', 'Filter categories by name or description')
    .option('--limit <number>', 'Maximum number of categories to return (default 100)')
    .option('--offset <number>', 'Results offset for pagination')
    .action(async (options: ListCategoriesOptions) => {
      await handleListCategoriesAction(options, deps, io)
    })
}

const handleListCategoriesAction = async (
  options: ListCategoriesOptions,
  deps: ListCategoriesDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const categories = await deps.listCategories.execute({
      search: options.search,
      limit: parseOptionalInteger(options.limit, 'limit'),
      offset: parseOptionalInteger(options.offset, 'offset'),
    })
    writeJson(io.stdout, {
      success: true,
      data: {
        categories: categories.map(serializeCategory),
        count: categories.length,
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

const parseOptionalInteger = (
  value: string | undefined,
  field: string,
): number | undefined => {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(`${field} must be a non-negative integer`, {
      field,
      value,
    })
  }
  return parsed
}

export type { ListCategoriesDependencies }
