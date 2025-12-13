import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerUpdateTodoCommand } from '@/cli/commands/updateTodo'
import type { CliIO } from '@/cli/io'
import { Todo } from '@/core/domain/Todo'
import { ValidationError } from '@/core/errors'
import type { UpdateTodo } from '@/core/usecases'

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

const baseArgs = ['node', 'cli', 'update', 'todo-123'] as const
const buildArgs = (...extra: string[]) => [...baseArgs, ...extra]

const buildProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
): Command => {
  const program = new Command()
  program.exitOverride()
  const updateTodo = { execute } as Pick<UpdateTodo, 'execute'>
  registerUpdateTodoCommand(program, { updateTodo }, io)
  return program
}

const stdout = createMemoryStream()
const stderr = createMemoryStream()
const io: CliIO = { stdout: stdout.stream, stderr: stderr.stream }

const buildUpdatedTodo = () =>
  Todo.restore({
    id: 'todo-123',
    title: 'Refocus research',
    status: 'in_progress',
    priority: 2,
    color: '#60a5fa',
    position: { x: 45, y: 80 },
    createdAt: new Date('2024-03-10T12:00:00.000Z'),
    updatedAt: new Date('2024-03-10T12:05:00.000Z'),
  })

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  process.exitCode = undefined
})

afterEach(() => {
  process.exitCode = undefined
})

describe('CLI update command', () => {
  it('delegates to UpdateTodo use case and prints JSON payload', async () => {
    const execute = vi.fn().mockResolvedValue(buildUpdatedTodo())
    const program = buildProgram(execute, io)

    await program.parseAsync(
      buildArgs('--title', 'Refocus research', '--priority', '2', '--x', '45', '--status', 'in_progress'),
    )

    expect(execute).toHaveBeenCalledWith({
      id: 'todo-123',
      title: 'Refocus research',
      priority: 2,
      position: { x: 45 },
      status: 'in_progress',
    })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.todo.id).toBe('todo-123')
    expect(payload.data.todo.updatedAt).toBe('2024-03-10T12:05:00.000Z')
    expect(stderr.read()).toBe('')
    expect(process.exitCode).toBeUndefined()
  })

  it('surfaces domain errors when the use case rejects', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new ValidationError('Invalid title', { field: 'title' }))
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('--title', ''))

    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })

  it('validates CLI options before executing the use case', async () => {
    const execute = vi.fn()
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('--status', 'blocked'))

    expect(execute).not.toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })
})
