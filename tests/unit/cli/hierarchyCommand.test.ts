import { Command } from 'commander'
import { Writable } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { registerHierarchyCommand } from '@/cli/commands/hierarchy'
import type { CliIO } from '@/cli/io'
import { Todo } from '@/core/domain/Todo'
import { Relationship } from '@/core/domain/Relationship'
import type { BoardSnapshot } from '@/core/usecases/GetBoardSnapshot'

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

const stdout = createMemoryStream()
const stderr = createMemoryStream()
const io: CliIO = { stdout: stdout.stream, stderr: stderr.stream }

beforeEach(() => {
  stdout.reset()
  stderr.reset()
  process.exitCode = undefined
})

describe('hierarchy command', () => {
  it('emits serialized hierarchy data with outline text', async () => {
    const snapshot = buildSnapshot()
    const execute = vi.fn().mockResolvedValue(snapshot)
    const program = buildProgram(execute)

    await program.parseAsync(['node', 'cli', 'hierarchy'])

    const payload = JSON.parse(stdout.read())
    expect(execute).toHaveBeenCalled()
    expect(payload.success).toBe(true)
    expect(payload.data.hierarchy).toHaveLength(1)
    expect(payload.data.hierarchy[0].children).toHaveLength(1)
    expect(payload.data.outline[0]).toMatch(/Root/)
    expect(payload.data.outline[1]).toMatch(/Child/)
  })

  it('serializes errors and sets exit code on failure', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('boom'))
    const program = buildProgram(execute)

    await program.parseAsync(['node', 'cli', 'hierarchy'])

    const payload = JSON.parse(stderr.read())
    expect(payload.success).toBe(false)
    expect(process.exitCode).toBe(1)
  })
})

const buildProgram = (execute: ReturnType<typeof vi.fn>): Command => {
  const program = new Command()
  program.exitOverride()
  registerHierarchyCommand(
    program,
    { getBoardSnapshot: { execute } },
    io,
  )
  return program
}

const buildSnapshot = (): BoardSnapshot => {
  const root = Todo.create({
    id: 'root',
    title: 'Root',
    priority: 5,
    status: 'pending',
  })
  const child = Todo.create({
    id: 'child',
    title: 'Child',
    priority: 3,
    status: 'in_progress',
  })
  const relationship = Relationship.create({
    id: 'rel-root-child',
    fromId: 'root',
    toId: 'child',
    type: 'parent_of',
  })
  return {
    tasks: [root, child],
    relationships: [relationship],
    totals: {
      count: 2,
      statuses: {
        pending: 1,
        in_progress: 1,
        completed: 0,
      },
      priorities: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
    },
    bounds: {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
      center: { x: 0, y: 0 },
    },
    viewport: {
      width: 1000,
      height: 1000,
      padding: 240,
      x: { min: -500, max: 500 },
      y: { min: -500, max: 500 },
    },
  }
}
