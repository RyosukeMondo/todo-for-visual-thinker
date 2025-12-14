import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

const IN_MEMORY_PREFIX = 'file:'

export const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'todos.db')

export const resolveDbPath = (candidate?: string): string => {
  if (!candidate) {
    return DEFAULT_DB_PATH
  }
  if (candidate === ':memory:' || candidate.startsWith(IN_MEMORY_PREFIX)) {
    return candidate
  }
  return isAbsolute(candidate) ? candidate : resolve(candidate)
}

export const ensureDbDirectory = (dbPath: string): void => {
  if (dbPath === ':memory:' || dbPath.startsWith(IN_MEMORY_PREFIX)) {
    return
  }
  const directory = dirname(dbPath)
  mkdirSync(directory, { recursive: true })
}

export const isFileBackedPath = (dbPath: string): boolean => {
  return dbPath !== ':memory:' && !dbPath.startsWith(IN_MEMORY_PREFIX)
}
