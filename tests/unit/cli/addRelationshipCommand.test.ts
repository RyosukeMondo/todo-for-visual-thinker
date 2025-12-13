import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerAddRelationshipCommand } from '@/cli/commands/addRelationship'
import { Relationship } from '@/core/domain/Relationship'
import type { CliIO } from '@/cli/io'
import type { CreateRelationship } from '@/core/usecases'
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

const baseArgs = ['node', 'cli', 'link', 'todo-visual', 'todo-canvas'] as const
const buildArgs = (...extra: string[]) => [...baseArgs, ...extra]

const buildRelationship = () =>
  Relationship.create({
    id: 'rel-001',
    fromId: 'todo-visual',
    toId: 'todo-canvas',
    type: 'depends_on',
    description: 'Connect visual layout to canvas prototype',
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
  })

const buildProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
): Command => {
  const program = new Command()
  program.exitOverride()
  registerAddRelationshipCommand(
    program,
    { createRelationship: { execute } as Pick<CreateRelationship, 'execute'> },
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

describe('CLI link command', () => {
  it('creates relationships via use case and writes structured JSON', async () => {
    const execute = vi.fn().mockResolvedValue(buildRelationship())
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('--type', 'depends_on', '--description', 'Connect layout'))

    expect(execute).toHaveBeenCalledWith({
      fromId: 'todo-visual',
      toId: 'todo-canvas',
      type: 'depends_on',
      description: 'Connect layout',
    })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.relationship.id).toBe('rel-001')
    expect(stderr.read()).toBe('')
  })

  it('enforces allowed relationship types before invoking use case', async () => {
    const execute = vi.fn()
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('--type', 'invalid'))

    expect(execute).not.toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })

  it('surfaces domain validation errors as structured JSON output', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new ValidationError('Relationship exists', { code: 'REL_DUP' }))
    const program = buildProgram(execute, io)

    await program.parseAsync([...baseArgs])

    expect(execute).toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
