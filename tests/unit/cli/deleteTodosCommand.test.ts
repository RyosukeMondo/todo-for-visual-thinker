import { Command } from 'commander'
import { Writable } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { registerDeleteTodosCommand } from '@/cli/commands/deleteTodos'
import type { CliIO } from '@/cli/io'
import { ValidationError } from '@/core/errors'

const createMemoryStream = () => {
  let buffer = ''
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        buffer += chunk.toString()
        callback()
      },
    }),
    read: () => buffer,
    reset: () => {
      buffer = ''
    },
  }
}

const baseArgs = ['node', 'cli', 'delete'] as const
const buildArgs = (...extra: string[]) => [...baseArgs, ...extra]

const setupProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
): Command => {
  const program = new Command()
  program.exitOverride()
  registerDeleteTodosCommand(program, { deleteTodo: { execute } }, io)
  return program
}

const stdout = createMemoryStream()
const stderr = createMemoryStream()
const io: CliIO = { stdout: stdout.stream, stderr: stderr.stream }

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  process.exitCode = undefined
})

describe('CLI delete command', () => {
  it('delegates to DeleteTodo use case with normalized identifiers', async () => {
    const execute = vi.fn().mockResolvedValue(undefined)
    const program = setupProgram(execute, io)

    await program.parseAsync(buildArgs('todo-1', ' todo-2 ', 'todo-1'))

    expect(execute).toHaveBeenCalledWith({ ids: ['todo-1', 'todo-2'] })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.deletedCount).toBe(2)
    expect(payload.data.ids).toEqual(['todo-1', 'todo-2'])
    expect(stderr.read()).toBe('')
    expect(process.exitCode).toBeUndefined()
  })

  it('surface domain errors as structured JSON and sets exit code', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new ValidationError('validation', { ids: [] }))
    const program = setupProgram(execute, io)

    await program.parseAsync(buildArgs('todo-3'))

    expect(execute).toHaveBeenCalledWith({ ids: ['todo-3'] })
    const errorPayload = JSON.parse(stderr.read().trim())
    expect(errorPayload.success).toBe(false)
    expect(errorPayload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
