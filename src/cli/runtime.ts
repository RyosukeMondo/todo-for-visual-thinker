import Database, { type Database as SQLiteInstance } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

import { SQLiteTodoRepository } from '@core/adapters/SQLiteTodoRepository'
import type { TodoRepository } from '@core/ports'
import { CreateTodo, DeleteTodo, ListTodos, UpdateTodo } from '@core/usecases'

export type RuntimeOverrides = Readonly<{
  dbPath?: string
  idGenerator?: () => string
  clock?: () => Date
  databaseFactory?: (path: string) => SQLiteInstance
}>

export type CliRuntime = Readonly<{
  repository: TodoRepository
  createTodo: CreateTodo
  listTodos: ListTodos
  deleteTodo: DeleteTodo
  updateTodo: UpdateTodo
  shutdown: () => void
}>

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'todos.db')

export const createRuntime = (overrides: RuntimeOverrides = {}): CliRuntime => {
  const dbPath = normalizeDbPath(overrides.dbPath ?? DEFAULT_DB_PATH)
  ensureDirectory(dbPath)
  const openDatabase = overrides.databaseFactory ?? ((path: string) => new Database(path))
  const db = openDatabase(dbPath)
  const repository = new SQLiteTodoRepository(db)
  const createTodo = new CreateTodo({
    repository,
    idGenerator: overrides.idGenerator ?? randomUUID,
    clock: overrides.clock,
  })
  const listTodos = new ListTodos({ repository })
  const deleteTodo = new DeleteTodo({ repository })
  const updateTodo = new UpdateTodo({ repository, clock: overrides.clock })

  return {
    repository,
    createTodo,
    listTodos,
    deleteTodo,
    updateTodo,
    shutdown: () => db.close(),
  }
}

const ensureDirectory = (filePath: string): void => {
  if (filePath === ':memory:' || filePath.startsWith('file:')) {
    return
  }
  const directory = dirname(filePath)
  mkdirSync(directory, { recursive: true })
}

const normalizeDbPath = (candidate: string): string => {
  if (candidate === ':memory:' || candidate.startsWith('file:')) {
    return candidate
  }
  return isAbsolute(candidate) ? candidate : resolve(candidate)
}
