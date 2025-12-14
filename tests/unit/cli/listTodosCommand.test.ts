
import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerListTodosCommand } from '@/cli/commands/listTodos'
import type { CliIO } from '@/cli/io'
import type { ListTodos } from '@/core/usecases'
import { Todo } from '@/core/domain/Todo'
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

const buildProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
): Command => {
  const program = new Command()
  program.exitOverride()
  registerListTodosCommand(program, { listTodos: { execute } as Pick<ListTodos, 'execute'> }, io)
  return program
}

const buildArgs = (...segments: string[]): string[] => ['node', 'cli', 'list', ...segments]

const buildTodo = (overrides: Partial<Parameters<typeof Todo.create>[0]> = {}) =>
  Todo.create({
    id: overrides.id ?? 'todo-1',
    title: overrides.title ?? 'Visual thinking research',
    status: overrides.status,
    priority: overrides.priority,
    category: overrides.category,
    color: overrides.color,
    position: overrides.position,
    description: overrides.description,
    createdAt: overrides.createdAt,
  })

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

describe('CLI list command', () => {
  it('forwards validated filters to the ListTodos use case and emits structured JSON', async () => {
    const execute = vi.fn().mockResolvedValue([
      buildTodo({ id: 'todo-visual', priority: 4, position: { x: 20, y: 30 } }),
    ])
    const program = buildProgram(execute, io)

    await program.parseAsync(buildComplexArgs())
    expect(execute).toHaveBeenCalledWith(expectedFilterPayload)
    expectSuccessPayload()
  })

  it('supports multiple statuses and default sort direction', async () => {
    const execute = vi.fn().mockResolvedValue([])
    const program = buildProgram(execute, io)

    await program.parseAsync(
      buildArgs('--status', 'pending', 'completed', '--sort', 'createdAt'),
    )

    expect(execute).toHaveBeenCalledWith({
      status: ['pending', 'completed'],
      category: undefined,
      search: undefined,
      priorityRange: undefined,
      limit: undefined,
      offset: undefined,
      viewport: undefined,
      sort: { field: 'createdAt', direction: undefined },
    })
  })

  it('surfaces validation issues as structured JSON errors', async () => {
    const execute = vi.fn().mockRejectedValue(
      new ValidationError('Invalid filters', { field: 'status' }),
    )
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs())

    expectErrorPayload()
  })

  it('renders human-readable output when --pretty is provided', async () => {
    const execute = vi.fn().mockResolvedValue([
      buildTodo({
        id: 'todo-human',
        title: 'Sketch motion study',
        description: 'Plan interactions',
        status: 'in_progress',
        priority: 4,
        color: '#22c55e',
        position: { x: 50, y: -40 },
      }),
    ])
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('--pretty'))

    const output = stdout.read()
    expect(output).toContain('Visual Task Board (1 task)')
    expect(output).toContain('Sketch motion study')
    expect(() => JSON.parse(output)).toThrow()
    expect(stderr.read()).toBe('')
  })
})

const expectSuccessPayload = () => {
  const payload = JSON.parse(stdout.read().trim())
  expect(payload.success).toBe(true)
  expect(payload.data.todos).toHaveLength(1)
  expect(payload.data.todos[0].id).toBe('todo-visual')
  expect(stderr.read()).toBe('')
}

const expectErrorPayload = () => {
  const payload = JSON.parse(stderr.read().trim())
  expect(payload.success).toBe(false)
  expect(payload.error.code).toBe('VALIDATION_ERROR')
  expect(process.exitCode).toBe(1)
}

const buildComplexArgs = () =>
  buildArgs(
    '--status', 'pending', '--category', 'Canvas',
    '--priority-min', '3', '--priority-max', '5',
    '--limit', '50', '--offset', '10',
    '--sort', 'priority', '--direction', 'desc',
    '--x-min', '-10', '--x-max', '100',
    '--y-min', '-20', '--y-max', '80',
  )

const expectedFilterPayload = {
  status: 'pending',
  category: 'Canvas',
  search: undefined,
  priorityRange: { min: 3, max: 5 },
  limit: 50,
  offset: 10,
  viewport: { x: { min: -10, max: 100 }, y: { min: -20, max: 80 } },
  sort: { field: 'priority', direction: 'desc' },
}
