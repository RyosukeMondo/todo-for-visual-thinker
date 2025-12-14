import { Command } from 'commander'

import type { CliRuntime } from './runtime'
import type { CliIO } from './io'
import { defaultIO } from './io'
import { registerAddTodoCommand } from './commands/addTodo'
import { registerListTodosCommand } from './commands/listTodos'
import { registerDeleteTodosCommand } from './commands/deleteTodos'
import { registerUpdateTodoCommand } from './commands/updateTodo'
import { registerAddRelationshipCommand } from './commands/addRelationship'
import { registerListRelationshipsCommand } from './commands/listRelationships'
import { registerDeleteRelationshipsCommand } from './commands/deleteRelationships'
import { registerUpdateRelationshipCommand } from './commands/updateRelationship'
import { registerStatusCommand } from './commands/status'
import { registerSnapshotCommand } from './commands/snapshot'
import { registerInitDbCommand } from './commands/initDb'

export const buildCliProgram = (
  runtime: CliRuntime,
  io: CliIO = defaultIO,
): Command => {
  const program = new Command()

  program
    .name('todo-visual-thinker')
    .description('Neuroscience-backed todo list for visual thinkers')
    .version('0.1.0')

  registerAddTodoCommand(program, { createTodo: runtime.createTodo }, io)
  registerInitDbCommand(program, io)
  registerListTodosCommand(program, { listTodos: runtime.listTodos }, io)
  registerDeleteTodosCommand(program, { deleteTodo: runtime.deleteTodo }, io)
  registerUpdateTodoCommand(program, { updateTodo: runtime.updateTodo }, io)
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
  registerStatusCommand(program, { getBoardStatus: runtime.getBoardStatus }, io)
  registerSnapshotCommand(program, { getBoardSnapshot: runtime.getBoardSnapshot }, io)

  return program
}
