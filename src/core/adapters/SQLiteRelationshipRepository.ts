import type { Database } from 'better-sqlite3'

import { Relationship, type RelationshipType } from '@core/domain/Relationship'
import type {
  RelationshipQuery,
  RelationshipRepository,
} from '@core/ports/RelationshipRepository'

export type SQLiteRelationshipRepositoryOptions = Readonly<{
  tableName?: string
}>

type RelationshipRow = Readonly<{
  id: string
  from_task_id: string
  to_task_id: string
  type: RelationshipType
  description: string | null
  created_at: number
  updated_at: number
}>

type QueryBuildResult = Readonly<{
  sql: string
  params: Record<string, unknown>
}>

export class SQLiteRelationshipRepository implements RelationshipRepository {
  private readonly tableName: string

  constructor(
    private readonly db: Database,
    options: SQLiteRelationshipRepositoryOptions = {},
  ) {
    this.tableName = options.tableName ?? 'relationships'
    this.ensureSchema()
  }

  async save(relationship: Relationship): Promise<void> {
    const row = this.toRow(relationship)
    const columns = [
      'id',
      'from_task_id',
      'to_task_id',
      'type',
      'description',
      'created_at',
      'updated_at',
    ]
    const placeholders = columns.map((column) => `@${column}`).join(', ')
    const assignments = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = excluded.${column}`)
      .join(', ')

    this.db
      .prepare(
        `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${assignments}`,
      )
      .run(row)
  }

  async findById(id: string): Promise<Relationship | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = @id LIMIT 1`)
      .get({ id }) as RelationshipRow | undefined
    return row ? this.fromRow(row) : null
  }

  async findBetween(
    fromId: string,
    toId: string,
    type?: RelationshipType,
  ): Promise<Relationship | null> {
    const clauses = ['from_task_id = @fromId', 'to_task_id = @toId']
    if (type) {
      clauses.push('type = @type')
    }
    const row = this.db
      .prepare(
        `SELECT * FROM ${this.tableName} WHERE ${clauses.join(' AND ')} LIMIT 1`,
      )
      .get({ fromId, toId, type }) as RelationshipRow | undefined
    return row ? this.fromRow(row) : null
  }

  async list(query: RelationshipQuery = {}): Promise<Relationship[]> {
    const { sql, params } = this.buildListQuery(query)
    const rows = this.db.prepare(sql).all(params) as RelationshipRow[]
    return rows.map((row) => this.fromRow(row))
  }

  async delete(id: string): Promise<void> {
    this.db
      .prepare(`DELETE FROM ${this.tableName} WHERE id = @id`)
      .run({ id })
  }

  async deleteByTodoId(todoId: string): Promise<void> {
    this.db
      .prepare(
        `DELETE FROM ${this.tableName} WHERE from_task_id = @todoId OR to_task_id = @todoId`,
      )
      .run({ todoId })
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        from_task_id TEXT NOT NULL,
        to_task_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_from ON ${this.tableName}(from_task_id);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_to ON ${this.tableName}(to_task_id);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON ${this.tableName}(type);
    `)
  }

  private buildListQuery(query: RelationshipQuery): QueryBuildResult {
    const clauses: string[] = []
    const params: Record<string, unknown> = {}

    this.applyEndpointFilters(query, clauses, params)
    this.applyTypeFilter(query.type, clauses, params)
    this.applyInvolvingFilter(query.involving, clauses, params)

    params.limit = query.limit ?? 500
    params.offset = query.offset ?? 0

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const sql = `SELECT * FROM ${this.tableName} ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
    return { sql, params }
  }

  private applyEndpointFilters(
    query: RelationshipQuery,
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (query.fromId) {
      clauses.push('from_task_id = @fromId')
      params.fromId = query.fromId
    }
    if (query.toId) {
      clauses.push('to_task_id = @toId')
      params.toId = query.toId
    }
  }

  private applyTypeFilter(
    typeFilter: RelationshipQuery['type'],
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (!typeFilter) return
    const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter]
    const placeholders = types.map((_, index) => `@type${index}`)
    types.forEach((type, index) => {
      params[`type${index}`] = type
    })
    clauses.push(`type IN (${placeholders.join(', ')})`)
  }

  private applyInvolvingFilter(
    todoId: string | undefined,
    clauses: string[],
    params: Record<string, unknown>,
  ): void {
    if (!todoId) return
    params.involving = todoId
    clauses.push('(from_task_id = @involving OR to_task_id = @involving)')
  }

  private toRow(relationship: Relationship): RelationshipRow {
    const data = relationship.toJSON()
    return {
      id: data.id,
      from_task_id: data.fromId,
      to_task_id: data.toId,
      type: data.type,
      description: data.description ?? null,
      created_at: data.createdAt.getTime(),
      updated_at: data.updatedAt.getTime(),
    }
  }

  private fromRow(row: RelationshipRow): Relationship {
    return Relationship.restore({
      id: row.id,
      fromId: row.from_task_id,
      toId: row.to_task_id,
      type: row.type,
      description: row.description ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })
  }
}
