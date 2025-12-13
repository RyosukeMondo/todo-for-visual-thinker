import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerListRelationshipsCommand } from '@/cli/commands/listRelationships'
import type { CliIO } from '@/cli/io'
import { Relationship } from '@/core/domain/Relationship'
import type { ListRelationships } from '@/core/usecases/ListRelationships'
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

const baseArgs = ['node', 'cli', 'links'] as const
const buildArgs = (...extra: string[]) => [...baseArgs, ...extra]

const buildRelationship = () =>
  Relationship.create({
    id: 'rel-002',
    fromId: 'todo-x',
    toId: 'todo-y',
    type: 'blocks',
    description: 'Blocks progress until visual polish complete',
    createdAt: new Date('2024-07-02T00:00:00.000Z'),
  })

const buildProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
): Command => {
  const program = new Command()
  program.exitOverride()
  registerListRelationshipsCommand(
    program,
    { listRelationships: { execute } as Pick<ListRelationships, 'execute'> },
    io,
  )
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

afterEach(() => {
  process.exitCode = undefined
})

describe('CLI links listing command', () => {
  it('invokes list relationships use case and writes structured output', async () => {
    const execute = vi.fn().mockResolvedValue([buildRelationship()])
    const program = buildProgram(execute, io)

    await program.parseAsync(
      buildArgs(
        '--from',
        'todo-x',
        '--type',
        'blocks',
        'depends_on',
        '--limit',
        '25',
        '--offset',
        '5',
      ),
    )

    expect(execute).toHaveBeenCalledWith({
      fromId: 'todo-x',
      type: ['blocks', 'depends_on'],
      limit: 25,
      offset: 5,
    })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.relationships).toHaveLength(1)
    expect(stderr.read()).toBe('')
  })

  it('validates type filters before executing the use case', async () => {
    const execute = vi.fn()
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('--type', 'unknown'))

    expect(execute).not.toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })

  it('surfaces domain errors from the use case as structured JSON', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new ValidationError('Invalid filter', { field: 'limit' }))
    const program = buildProgram(execute, io)

    await program.parseAsync([...baseArgs])

    expect(execute).toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
