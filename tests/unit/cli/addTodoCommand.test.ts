import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerAddTodoCommand } from '@/cli/commands/addTodo'
import { Todo } from '@/core/domain/Todo'
import { ValidationError } from '@/core/errors'
import type { CliIO } from '@/cli/io'
import type { CreateTodo, ListTodos } from '@/core/usecases'
import type { CanvasPosition } from '@/core/domain/Todo'

const createMemoryStream = () => {
  let buffer = ''
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += chunk.toString()
      callback()
    },
  })
  return {
    stream,
    read: () => buffer,
    reset: () => {
      buffer = ''
    },
  }
}

const baseArgs = ['node', 'cli', 'add', 'Map research journey'] as const

const buildArgs = (...extra: string[]) => [...baseArgs, ...extra]

const buildCompletedTodo = () =>
  Todo.restore({
    id: 'todo-123',
    title: 'Map research journey',
    description: 'Sketch dependencies',
    status: 'completed',
    priority: 4,
    color: '#60a5fa',
    position: { x: 120, y: 80 },
    createdAt: new Date('2024-03-10T12:00:00.000Z'),
    updatedAt: new Date('2024-03-10T12:01:00.000Z'),
    completedAt: new Date('2024-03-10T12:02:00.000Z'),
  })

const buildProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
  overrides: {
    listTodosExecute?: ReturnType<typeof vi.fn>
    planPosition?: ReturnType<typeof vi.fn>
  } = {},
): {
  program: Command
  listTodosExecute: ReturnType<typeof vi.fn>
  planPosition: ReturnType<typeof vi.fn>
} => {
  const program = new Command()
  program.exitOverride()
  const listTodosExecute = overrides.listTodosExecute ?? vi.fn().mockResolvedValue([])
  const planPosition = overrides.planPosition ?? vi.fn().mockReturnValue({ x: 0, y: 0 })
  const createTodo = { execute } as Pick<CreateTodo, 'execute'>
  registerAddTodoCommand(
    program,
    {
      createTodo,
      listTodos: { execute: listTodosExecute as Pick<ListTodos, 'execute'>['execute'] },
      planPosition: planPosition as (existing: readonly Todo[]) => CanvasPosition,
    },
    io,
  )
  return { program, listTodosExecute, planPosition }
}

const stdout = createMemoryStream()
const stderr = createMemoryStream()
const io: CliIO = { stdout: stdout.stream, stderr: stderr.stream }

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  process.exitCode = undefined
})

afterEach(() => {
  process.exitCode = undefined
})

describe('CLI add command', () => {
  it('persists todos through the CreateTodo use case and prints structured output', async () => {
    const execute = vi.fn().mockResolvedValue(buildCompletedTodo())
    const { program, listTodosExecute, planPosition } = buildProgram(execute, io)

    await program.parseAsync(
      buildArgs('--priority', '4', '--x', '120', '--y', '80', '--status', 'completed'),
    )

    expect(execute).toHaveBeenCalledWith({
      title: 'Map research journey',
      priority: 4,
      position: { x: 120, y: 80 },
      status: 'completed',
    })
    expectSuccessfulAdd(stdout.read())
    expect(stderr.read()).toBe('')
    expect(process.exitCode).toBeUndefined()
    expect(listTodosExecute).not.toHaveBeenCalled()
    expect(planPosition).not.toHaveBeenCalled()
  })

  it('surfaces domain validation errors as structured JSON and sets exit code', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new ValidationError('Title is required', { field: 'title' }))
    const { program } = buildProgram(execute, io)

    await program.parseAsync([...baseArgs])

    const errorPayload = JSON.parse(stderr.read().trim())
    expect(errorPayload.success).toBe(false)
    expect(errorPayload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })

  it('validates CLI-specific options before executing the use case', async () => {
    const execute = vi.fn()
    const { program } = buildProgram(execute, io)

    await program.parseAsync(buildArgs('--status', 'unknown'))

    expect(execute).not.toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })

  it('auto-positions tasks when coordinates are not provided', async () => {
    const execute = vi.fn().mockResolvedValue(buildCompletedTodo())
    const listTodosExecute = vi.fn().mockResolvedValue([buildCompletedTodo()])
    const planPosition = vi.fn().mockReturnValue({ x: 640, y: -180 })
    const { program } = buildProgram(execute, io, {
      listTodosExecute,
      planPosition,
    })

    await program.parseAsync([...baseArgs])

    expect(listTodosExecute).toHaveBeenCalledWith({ limit: 500 })
    expect(planPosition).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        position: { x: 640, y: -180 },
      }),
    )
  })
})

const expectSuccessfulAdd = (output: string) => {
  const result = JSON.parse(output.trim())
  expect(result.success).toBe(true)
  expect(result.data.todo.id).toBe('todo-123')
  expect(result.data.todo.createdAt).toBe('2024-03-10T12:00:00.000Z')
}
