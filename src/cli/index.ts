#!/usr/bin/env node

import { buildCliProgram } from './program'
import { createRuntime } from './runtime'
import { defaultIO, writeJson } from './io'

const runtime = createRuntime()
const io = defaultIO
const program = buildCliProgram(runtime, io)

const main = async (): Promise<void> => {
  try {
    await program.parseAsync()
  } catch (error) {
    writeJson(io.stderr, {
      success: false,
      error: {
        code: 'CLI_RUNTIME_ERROR',
        message: error instanceof Error ? error.message : 'CLI failed unexpectedly',
      },
    })
    process.exitCode = 1
  } finally {
    runtime.shutdown()
  }
}

void main()
