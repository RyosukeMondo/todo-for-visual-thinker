import { Command } from 'commander'

import type { CliRuntime } from './runtime'
import type { CliIO } from './io'
import { defaultIO } from './io'
import { registerAddTodoCommand } from './commands/addTodo'
import { registerListTodosCommand } from './commands/listTodos'
import { registerDeleteTodosCommand } from './commands/deleteTodos'
import { registerUpdateTodoCommand } from './commands/updateTodo'
import { registerAddCategoryCommand } from './commands/addCategory'
import { registerListCategoriesCommand } from './commands/listCategories'
import { registerAddRelationshipCommand } from './commands/addRelationship'
import { registerListRelationshipsCommand } from './commands/listRelationships'
import { registerDeleteRelationshipsCommand } from './commands/deleteRelationships'
import { registerUpdateRelationshipCommand } from './commands/updateRelationship'
import { registerStatusCommand } from './commands/status'
import { registerSnapshotCommand } from './commands/snapshot'
import { registerHierarchyCommand } from './commands/hierarchy'
import { registerInitDbCommand } from './commands/initDb'
import { planSpiralPosition } from '@server/placement/SpiralPositionPlanner'

export const buildCliProgram = (
  runtime: CliRuntime,
  io: CliIO = defaultIO,
): Command => {
  const program = configureMetadata()
  registerTodoCommands(program, runtime, io)
  registerRelationshipCommands(program, runtime, io)
  registerBoardCommands(program, runtime, io)
  return program
}

const configureMetadata = (): Command =>
  new Command()
    .name('todo-visual-thinker')
    .description('Neuroscience-backed todo list for visual thinkers')
    .version('0.1.0')

const registerTodoCommands = (
  program: Command,
  runtime: CliRuntime,
  io: CliIO,
): void => {
  registerAddTodoCommand(
    program,
    {
      createTodo: runtime.createTodo,
      listTodos: runtime.listTodos,
      planPosition: planSpiralPosition,
    },
    io,
  )
  registerListTodosCommand(program, { listTodos: runtime.listTodos }, io)
  registerDeleteTodosCommand(program, { deleteTodo: runtime.deleteTodo }, io)
  registerUpdateTodoCommand(program, { updateTodo: runtime.updateTodo }, io)
  registerInitDbCommand(program, io)
  registerAddCategoryCommand(
    program,
    { createCategory: runtime.createCategory },
    io,
  )
  registerListCategoriesCommand(
    program,
    { listCategories: runtime.listCategories },
    io,
  )
}

const registerRelationshipCommands = (
  program: Command,
  runtime: CliRuntime,
  io: CliIO,
): void => {
  registerAddRelationshipCommand(
    program,
    { createRelationship: runtime.createRelationship },
    io,
  )
  registerListRelationshipsCommand(
    program,
    { listRelationships: runtime.listRelationships },
    io,
  )
  registerDeleteRelationshipsCommand(
    program,
    { deleteRelationship: runtime.deleteRelationship },
    io,
  )
  registerUpdateRelationshipCommand(
    program,
    { updateRelationship: runtime.updateRelationship },
    io,
  )
}

const registerBoardCommands = (
  program: Command,
  runtime: CliRuntime,
  io: CliIO,
): void => {
  registerStatusCommand(program, { getBoardStatus: runtime.getBoardStatus }, io)
  registerSnapshotCommand(program, { getBoardSnapshot: runtime.getBoardSnapshot }, io)
  registerHierarchyCommand(program, { getBoardSnapshot: runtime.getBoardSnapshot }, io)
}
