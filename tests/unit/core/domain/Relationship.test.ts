import { describe, expect, it } from 'vitest'

import { Relationship } from '@/core/domain/Relationship'

const buildBaseInput = () => ({
  id: 'rel-1',
  fromId: 'todo-a',
  toId: 'todo-b',
  type: 'depends_on' as const,
})

describe('Relationship', () => {
  it('creates a relationship with normalized values', () => {
    const relationship = Relationship.create({
      ...buildBaseInput(),
      id: '  rel-1  ',
      description: '  Blocked by research  ',
    })

    expect(relationship.id).toBe('rel-1')
    expect(relationship.description).toBe('Blocked by research')
    expect(relationship.createdAt.getTime()).toBeGreaterThan(0)
    expect(relationship.updatedAt.getTime()).toBeGreaterThan(0)
  })

  it('prevents identical endpoints', () => {
    expect(() =>
      Relationship.create({
        ...buildBaseInput(),
        toId: 'todo-a',
      }),
    ).toThrow(/endpoints must be different/)
  })

  it('changes type while keeping invariants', () => {
    const relationship = Relationship.create(buildBaseInput())
    relationship.changeType('blocks')

    expect(relationship.type).toBe('blocks')
  })

  it('validates description length', () => {
    const relationship = Relationship.create(buildBaseInput())

    expect(() =>
      relationship.attachDescription('x'.repeat(600)),
    ).toThrow(/exceeds/)
  })

  it('detects if a task id is connected', () => {
    const relationship = Relationship.create(buildBaseInput())

    expect(relationship.connects('todo-a')).toBe(true)
    expect(relationship.connects('todo-b')).toBe(true)
    expect(relationship.connects('todo-c')).toBe(false)
  })
})
