import type { Database } from 'better-sqlite3'

import { Todo, type TodoPriority, type TodoStatus } from '@core/domain/Todo'
import type {
  ListTodosQuery,
  TodoRepository,
} from '@core/ports/TodoRepository'

type TodoRow = {
  id: string
  title: string
  description: string | null
  status: TodoStatus
  priority: TodoPriority
  category: string | null
  color: string
  icon: string | null
  position_x: number
  position_y: number
  created_at: number
  updated_at: number
  completed_at: number | null
}

type QueryBuildResult = Readonly<{
  sql: string
  params: Record<string, unknown>
}>

export type SQLiteTodoRepositoryOptions = Readonly<{
  tableName?: string
}>

const COLUMN_MAP = {
  priority: 'priority',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const

export class SQLiteTodoRepository implements TodoRepository {
  private readonly tableName: string

  constructor(
    private readonly db: Database,
    options: SQLiteTodoRepositoryOptions = {},
  ) {
    this.tableName = options.tableName ?? 'todos'
    this.ensureSchema()
  }

  async save(todo: Todo): Promise<void> {
    const record = this.toRow(todo)
    const columns = [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'category',
      'color',
      'icon',
      'position_x',
      'position_y',
      'created_at',
      'updated_at',
      'completed_at',
    ]
    const columnList = columns.join(', ')
    const assignments = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = excluded.${column}`)
      .join(', ')

    this.db
      .prepare(
        `INSERT INTO ${this.tableName} (${columnList}) VALUES (@id, @title, @description, @status, @priority, @category, @color, @icon, @position_x, @position_y, @created_at, @updated_at, @completed_at)
         ON CONFLICT(id) DO UPDATE SET ${assignments}`,
      )
      .run(record)
  }

  async findById(id: string): Promise<Todo | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = @id LIMIT 1`)
      .get({ id }) as TodoRow | undefined
    if (!row) return null
    return this.fromRow(row)
  }

  async list(query: ListTodosQuery = {}): Promise<Todo[]> {
    const { sql, params } = this.buildListQuery(query)
    const rows = this.db.prepare(sql).all(params) as TodoRow[]
    return rows.map((row) => this.fromRow(row))
  }

  async delete(id: string): Promise<void> {
    this.db
      .prepare(`DELETE FROM ${this.tableName} WHERE id = @id`)
      .run({ id })
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const statement = this.db.prepare(
      `DELETE FROM ${this.tableName} WHERE id = @id`,
    )
    const remove = this.db.transaction((identifiers: string[]) => {
      identifiers.forEach((identifier) => statement.run({ id: identifier }))
    })
    remove(ids)
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority INTEGER NOT NULL,
        category TEXT,
        color TEXT NOT NULL,
        icon TEXT,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON ${this.tableName}(status);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_category ON ${this.tableName}(category);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_priority ON ${this.tableName}(priority);
    `)
  }

  private buildListQuery(query: ListTodosQuery): QueryBuildResult {
    const clauses: string[] = []
    const params: Record<string, unknown> = {}

    this.applyStatusFilter(query.status, clauses, params)
    this.applyCategoryFilter(query.category, clauses, params)
    this.applySearchFilter(query.search, clauses, params)
    this.applyPriorityFilter(query.priorityRange, clauses, params)
    this.applyViewportFilter(query.viewport, clauses, params)

    params.limit = query.limit ?? 500
    params.offset = query.offset ?? 0

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const orderBy = this.buildOrderByClause(query)
    const sql = `SELECT * FROM ${this.tableName} ${where} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`
    return { sql, params }
  }

  private applyStatusFilter(
    statusFilter: ListTodosQuery['status'],
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (!statusFilter) return
    const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter]
    const placeholders = statuses.map((_, index) => `@status${index}`)
    statuses.forEach((status, index) => {
      params[`status${index}`] = status
    })
    clauses.push(`status IN (${placeholders.join(', ')})`)
  }

  private applyCategoryFilter(
    category: string | undefined,
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (!category) return
    params.category = category.toLowerCase()
    clauses.push('LOWER(category) = @category')
  }

  private applySearchFilter(
    search: string | undefined,
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (!search) return
    params.search = `%${search.toLowerCase()}%`
    clauses.push(`(
      LOWER(title) LIKE @search OR
      LOWER(IFNULL(description, '')) LIKE @search OR
      LOWER(IFNULL(category, '')) LIKE @search
    )`)
  }

  private applyPriorityFilter(
    range: ListTodosQuery['priorityRange'],
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (!range) return
    if (typeof range.min === 'number') {
      params.priorityMin = range.min
      clauses.push('priority >= @priorityMin')
    }
    if (typeof range.max === 'number') {
      params.priorityMax = range.max
      clauses.push('priority <= @priorityMax')
    }
  }

  private applyViewportFilter(
    viewport: ListTodosQuery['viewport'],
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (!viewport) return
    params.xMin = viewport.x.min
    params.xMax = viewport.x.max
    params.yMin = viewport.y.min
    params.yMax = viewport.y.max
    clauses.push('position_x BETWEEN @xMin AND @xMax')
    clauses.push('position_y BETWEEN @yMin AND @yMax')
  }

  private buildOrderByClause(query: ListTodosQuery): string {
    const field = query.sort?.field ?? 'createdAt'
    const column = COLUMN_MAP[field]
    const direction = query.sort?.direction === 'desc' ? 'DESC' : 'ASC'
    const segments: string[] = [`${column} ${direction}`]
    if (column !== COLUMN_MAP.createdAt) {
      segments.push(`${COLUMN_MAP.createdAt} ASC`)
    }
    return segments.join(', ')
  }

  private toRow(todo: Todo): TodoRow {
    const props = todo.toJSON()
    return {
      id: props.id,
      title: props.title,
      description: props.description ?? null,
      status: props.status,
      priority: props.priority,
      category: props.category ?? null,
      color: props.color,
      icon: props.icon ?? null,
      position_x: props.position.x,
      position_y: props.position.y,
      created_at: props.createdAt.getTime(),
      updated_at: props.updatedAt.getTime(),
      completed_at: props.completedAt?.getTime() ?? null,
    }
  }

  private fromRow(row: TodoRow): Todo {
    return Todo.restore({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      status: row.status,
      priority: row.priority,
      category: row.category ?? undefined,
      color: row.color,
      icon: row.icon ?? undefined,
      position: {
        x: row.position_x,
        y: row.position_y,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    })
  }
}
