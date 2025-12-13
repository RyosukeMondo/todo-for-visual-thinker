import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SQLiteRelationshipRepository } from '@/core/adapters/SQLiteRelationshipRepository'
import { Relationship, type CreateRelationshipInput } from '@/core/domain/Relationship'

const createRepo = () => {
  const db = new Database(':memory:')
  const repository = new SQLiteRelationshipRepository(db)
  return { db, repository }
}

describe('SQLiteRelationshipRepository - persistence', () => {
  let db: Database
  let repository: SQLiteRelationshipRepository

  beforeEach(() => ({ db, repository } = createRepo()))
  afterEach(() => {
    db.close()
  })

  it('persists and retrieves relationships', async () => {
    const relationship = buildRelationship({ description: 'Depends for layout' })
    await repository.save(relationship)

    const stored = await repository.findById(relationship.id)
    expect(stored?.toJSON()).toMatchObject({
      id: relationship.id,
      description: 'Depends for layout',
    })

    relationship.changeType('blocks')
    await repository.save(relationship)

    const updated = await repository.findBetween(
      relationship.fromId,
      relationship.toId,
      'blocks',
    )
    expect(updated?.type).toBe('blocks')
  })
})

describe('SQLiteRelationshipRepository - querying', () => {
  let db: Database
  let repository: SQLiteRelationshipRepository

  beforeEach(() => ({ db, repository } = createRepo()))
  afterEach(() => {
    db.close()
  })

  it('filters by endpoints, type sets, and involving criteria', async () => {
    const match = buildRelationship({
      fromId: 'todo-visual',
      toId: 'todo-render',
      type: 'blocks',
      createdAt: new Date('2024-04-05T10:00:00Z'),
    })
    await repository.save(match)

    await repository.save(
      buildRelationship({ fromId: 'todo-other', toId: 'todo-render', type: 'related_to' }),
    )
    await repository.save(
      buildRelationship({ fromId: 'todo-visual', toId: 'todo-extra', type: 'depends_on' }),
    )

    const results = await repository.list({
      fromId: 'todo-visual',
      toId: 'todo-render',
      type: ['blocks', 'depends_on'],
      involving: 'todo-render',
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(match.id)
  })

  it('honors pagination order', async () => {
    const older = buildRelationship({ createdAt: new Date('2024-03-01T00:00:00Z') })
    const newer = buildRelationship({ createdAt: new Date('2024-05-01T00:00:00Z') })
    await repository.save(older)
    await repository.save(newer)

    const [first] = await repository.list({ limit: 1, offset: 0 })
    expect(first.id).toBe(newer.id)
  })
})

describe('SQLiteRelationshipRepository - deletion', () => {
  let db: Database
  let repository: SQLiteRelationshipRepository

  beforeEach(() => ({ db, repository } = createRepo()))
  afterEach(() => {
    db.close()
  })

  it('deletes by id and todo reference', async () => {
    const keep = buildRelationship({ id: 'rel-keep', fromId: 'todo-keep' })
    const removeById = buildRelationship({ id: 'rel-remove', fromId: 'todo-remove' })
    const removeByEndpoint = buildRelationship({ id: 'rel-endpoint', toId: 'todo-remove' })

    await repository.save(keep)
    await repository.save(removeById)
    await repository.save(removeByEndpoint)

    await repository.delete(removeById.id)
    await repository.deleteByTodoId('todo-remove')

    const remaining = await repository.list()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(keep.id)
  })
})

let counter = 0
const buildRelationship = (
  overrides: Partial<CreateRelationshipInput & { id: string; createdAt: Date }> = {},
): Relationship => {
  counter += 1
  return Relationship.create({
    id: overrides.id ?? `relationship-${counter}`,
    fromId: overrides.fromId ?? 'todo-alpha',
    toId: overrides.toId ?? 'todo-beta',
    type: overrides.type ?? 'depends_on',
    description: overrides.description,
    createdAt:
      overrides.createdAt ?? new Date(`2024-02-${String(counter).padStart(2, '0')}T00:00:00Z`),
  })
}
