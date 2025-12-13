import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'

import { SQLiteRelationshipRepository } from '@/core/adapters/SQLiteRelationshipRepository'
import { Relationship } from '@/core/domain/Relationship'
import { UpdateRelationship } from '@/core/usecases/UpdateRelationship'

describe('UpdateRelationship integration', () => {
  const db = new Database(':memory:')
  const repository = new SQLiteRelationshipRepository(db)
  const useCase = new UpdateRelationship({ repository })

  beforeAll(() => {
    // schema initialized by repository constructor
  })

  afterAll(() => {
    db.close()
  })

  beforeEach(() => {
    db.exec('DELETE FROM relationships;')
  })

  it('persists relationship updates to SQLite', async () => {
    const relationship = Relationship.create({
      id: 'rel-1',
      fromId: 'todo-1',
      toId: 'todo-2',
      type: 'depends_on',
      description: 'Initial link',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    })
    await repository.save(relationship)

    await useCase.execute({ id: 'rel-1', type: 'blocks', description: '' })

    const stored = await repository.findById('rel-1')
    expect(stored).not.toBeNull()
    expect(stored?.type).toBe('blocks')
    expect(stored?.description).toBeUndefined()
  })
})
