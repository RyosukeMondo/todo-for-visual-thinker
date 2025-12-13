import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerUpdateRelationshipCommand } from '@/cli/commands/updateRelationship'
import { Relationship } from '@/core/domain/Relationship'
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

const baseArgs = ['node', 'cli', 'relink'] as const
const buildArgs = (...extra: string[]) => [...baseArgs, ...extra]

const relationship = Relationship.create({
  id: 'rel-1',
  fromId: 'todo-visual',
  toId: 'todo-canvas',
  type: 'depends_on',
  description: 'Initial link',
  createdAt: new Date('2024-05-01T00:00:00.000Z'),
})

const buildProgram = (execute: ReturnType<typeof vi.fn>, io: CliIO): Command => {
  const program = new Command()
  program.exitOverride()
  registerUpdateRelationshipCommand(
    program,
    { updateRelationship: { execute } },
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

describe('CLI relink command', () => {
  it('invokes updateRelationship use case and writes relationship JSON', async () => {
    const execute = vi.fn().mockResolvedValue(relationship)
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('rel-1', '--type', 'blocks'))

    expect(execute).toHaveBeenCalledWith({ id: 'rel-1', type: 'blocks' })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.relationship.id).toBe('rel-1')
    expect(stderr.read()).toBe('')
  })

  it('fails fast on invalid relationship types', async () => {
    const execute = vi.fn()
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('rel-1', '--type', 'invalid'))

    expect(execute).not.toHaveBeenCalled()
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })

  it('propagates domain errors from the use case as structured JSON', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new ValidationError('conflict', { code: 'REL_DUP' }))
    const program = buildProgram(execute, io)

    await program.parseAsync(buildArgs('rel-1', '--description', 'Update link'))

    expect(execute).toHaveBeenCalledWith({
      id: 'rel-1',
      description: 'Update link',
    })
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
