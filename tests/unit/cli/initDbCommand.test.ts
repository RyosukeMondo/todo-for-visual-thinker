import { Command } from 'commander'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { Writable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { registerInitDbCommand } from '@/cli/commands/initDb'
import type { CliIO } from '@/cli/io'

const createMemoryIO = () => {
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      stdoutChunks.push(String(chunk))
      callback()
    },
  })

  const stderr = new Writable({
    write(chunk, _encoding, callback) {
      stderrChunks.push(String(chunk))
      callback()
    },
  })

  const io: CliIO = { stdout, stderr }

  return {
    io,
    readStdout: () => stdoutChunks.join(''),
    readStderr: () => stderrChunks.join(''),
    reset: () => {
      stdoutChunks.length = 0
      stderrChunks.length = 0
    },
  }
}

const createProgram = (io: CliIO) => {
  const program = new Command()
  program.exitOverride()
  registerInitDbCommand(program, io)
  return program
}

const createTempDbPath = () => {
  const dir = mkdtempSync(join(tmpdir(), 'todo-init-'))
  const path = join(dir, 'todos.db')
  const cleanup = () => rmSync(dir, { recursive: true, force: true })
  return { path, cleanup }
}

describe('init-db command', () => {
  const captured = createMemoryIO()

  beforeEach(() => {
    captured.reset()
    process.exitCode = undefined
  })

  afterEach(() => {
    captured.reset()
    process.exitCode = undefined
  })

  it('creates schema and optional seed data', async () => {
    const { path, cleanup } = createTempDbPath()
    const program = createProgram(captured.io)

    await program.parseAsync([
      'node',
      'cli',
      'init-db',
      '--db',
      path,
      '--seed-demo',
    ])

    const payload = JSON.parse(captured.readStdout())
    expect(payload.success).toBe(true)
    expect(payload.data.dbPath).toBe(path)
    expect(payload.data.seededDemoTasks).toBe(3)
    expect(payload.data.overwroteExisting).toBe(false)
    expect(captured.readStderr()).toBe('')
    expect(process.exitCode).toBeUndefined()

    const db = new Database(path)
    const count = db.prepare('SELECT COUNT(*) AS count FROM todos').get() as { count: number }
    expect(count.count).toBe(3)
    db.close()

    cleanup()
  })

  it('requires --force to overwrite existing database file', async () => {
    const { path, cleanup } = createTempDbPath()
    const program = createProgram(captured.io)

    await program.parseAsync(['node', 'cli', 'init-db', '--db', path])
    captured.reset()

    await program.parseAsync(['node', 'cli', 'init-db', '--db', path])

    const errorPayload = JSON.parse(captured.readStderr())
    expect(errorPayload.success).toBe(false)
    expect(errorPayload.error.code).toBe('VALIDATION_ERROR')
    expect(process.exitCode).toBe(1)

    const fileContents = readFileSync(path)
    expect(fileContents.byteLength).toBeGreaterThan(0)

    cleanup()
  })
})
