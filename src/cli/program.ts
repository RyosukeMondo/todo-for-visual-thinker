import { Command } from 'commander'

import type { CliRuntime } from './runtime'
import type { CliIO } from './io'
import { defaultIO, writeJson } from './io'
import { registerAddTodoCommand } from './commands/addTodo'

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
  registerListPlaceholder(program, io)

  return program
}

const registerListPlaceholder = (program: Command, io: CliIO): void => {
  program
    .command('list')
    .description('List existing todos (coming soon)')
    .action(() => {
      writeJson(io.stdout, {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'List command is not implemented yet',
        },
      })
      process.exitCode = 1
    })
}
