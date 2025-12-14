import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerSnapshotCommand } from '@/cli/commands/snapshot'
import type { CliIO } from '@/cli/io'
import { Todo } from '@/core/domain/Todo'
import type { GetBoardSnapshot } from '@/core/usecases/GetBoardSnapshot'
import { ValidationError } from '@/core/errors'

const createStream = () => {
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

const stdout = createStream()
const stderr = createStream()
const io: CliIO = { stdout: stdout.stream, stderr: stderr.stream }

const buildProgram = (deps: Parameters<typeof registerSnapshotCommand>[1]): Command => {
  const program = new Command()
  program.exitOverride()
  registerSnapshotCommand(program, deps, io)
  return program
}

const buildArgs = (...segments: string[]): string[] => ['node', 'cli', 'snapshot', ...segments]

const buildTodo = (overrides: Partial<Parameters<typeof Todo.create>[0]> = {}) =>
  Todo.create({
    id: overrides.id ?? 'todo-1',
    title: overrides.title ?? 'Visual mapping',
    status: overrides.status ?? 'pending',
    priority: overrides.priority ?? 3,
    color: overrides.color ?? '#f97316',
    position: overrides.position ?? { x: 0, y: 0 },
    createdAt: overrides.createdAt,
  })

let executeMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  executeMock = vi.fn()
  process.exitCode = undefined
})

afterEach(() => {
  process.exitCode = undefined
})

describe('snapshot CLI command', () => {
  it('returns serialized snapshot payloads', async () => {
    executeMock.mockResolvedValue({
      tasks: [buildTodo({ id: 'todo-a', position: { x: 50, y: -20 } })],
      totals: { count: 1, statuses: { pending: 1, in_progress: 0, completed: 0 }, priorities: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 } },
      bounds: { minX: 50, maxX: 50, minY: -20, maxY: -20, width: 0, height: 0, center: { x: 50, y: -20 } },
      viewport: { width: 480, height: 480, padding: 240, x: { min: -190, max: 290 }, y: { min: -260, max: 220 } },
    })
    const program = buildProgram({ getBoardSnapshot: { execute: executeMock } as Pick<GetBoardSnapshot, 'execute'> })

    await program.parseAsync(buildArgs('--status', 'pending'))

    expect(executeMock).toHaveBeenCalledWith({
      status: 'pending',
      category: undefined,
      search: undefined,
      priorityRange: undefined,
      limit: undefined,
      offset: undefined,
      viewport: undefined,
      sort: undefined,
    })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.totals.count).toBe(1)
    expect(payload.data.tasks[0].position).toEqual({ x: 50, y: -20 })
  })

  it('emits structured errors for invalid filters', async () => {
    executeMock.mockRejectedValue(new ValidationError('Bad filters', { field: 'priority' }))
    const program = buildProgram({ getBoardSnapshot: { execute: executeMock } as Pick<GetBoardSnapshot, 'execute'> })

    await program.parseAsync(buildArgs('--priority-min', '0'))

    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
