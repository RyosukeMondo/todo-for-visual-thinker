import type { Command } from 'commander'

import type { CreateCategory } from '@core/usecases'
import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeCategory, serializeError } from '../serializers'

type AddCategoryDependencies = Readonly<{
  createCategory: Pick<CreateCategory, 'execute'>
}>

type AddCategoryOptions = Readonly<{
  color?: string
  icon?: string
  description?: string
}>

export const registerAddCategoryCommand = (
  program: Command,
  deps: AddCategoryDependencies,
  io: CliIO,
): void => {
  program
    .command('category:add')
    .description('Create a new visual category')
    .argument('<name>', 'Category label')
    .option('--color <hex>', 'Hex color (e.g. #f97316)')
    .option('--icon <token>', 'Optional icon token (max 40 chars)')
    .option('-d, --description <text>', 'Optional description')
    .action(async (name: string, options: AddCategoryOptions) => {
      await handleAddCategoryAction(name, options, deps, io)
    })
}

const handleAddCategoryAction = async (
  name: string,
  options: AddCategoryOptions,
  deps: AddCategoryDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const category = await deps.createCategory.execute({
      name,
      color: options.color,
      icon: options.icon,
      description: options.description,
    })
    writeJson(io.stdout, {
      success: true,
      data: {
        category: serializeCategory(category),
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

export type { AddCategoryDependencies }

