import { Command } from 'commander'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerDeleteRelationshipsCommand } from '@/cli/commands/deleteRelationships'
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

const baseArgs = ['node', 'cli', 'unlink'] as const
const buildArgs = (...extra: string[]) => [...baseArgs, ...extra]

const setupProgram = (
  execute: ReturnType<typeof vi.fn>,
  io: CliIO,
): Command => {
  const program = new Command()
  program.exitOverride()
  registerDeleteRelationshipsCommand(
    program,
    { deleteRelationship: { execute } },
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

describe('CLI unlink command', () => {
  it('normalizes identifiers and delegates deletion', async () => {
    const execute = vi.fn().mockResolvedValue(undefined)
    const program = setupProgram(execute, io)

    await program.parseAsync(buildArgs('rel-1', ' rel-2 ', 'rel-1'))

    expect(execute).toHaveBeenCalledWith({ ids: ['rel-1', 'rel-2'] })
    const payload = JSON.parse(stdout.read().trim())
    expect(payload.success).toBe(true)
    expect(payload.data.deletedCount).toBe(2)
    expect(payload.data.ids).toEqual(['rel-1', 'rel-2'])
    expect(stderr.read()).toBe('')
    expect(process.exitCode).toBeUndefined()
  })

  it('reports structured errors and sets exit code when deletion fails', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new ValidationError('Missing ids', { ids: [] }))
    const program = setupProgram(execute, io)

    await program.parseAsync(buildArgs('rel-404'))

    expect(execute).toHaveBeenCalledWith({ ids: ['rel-404'] })
    const payload = JSON.parse(stderr.read().trim())
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)
  })
})
