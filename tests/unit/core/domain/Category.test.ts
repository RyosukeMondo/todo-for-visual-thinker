import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Category } from '@core/domain/Category'
import { ValidationError } from '@core/errors'

const baseInput = {
  id: 'cat-001',
  name: 'Research',
  color: '#0ea5e9',
}

const createBaseCategory = (): Category => Category.create(baseInput)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Category.create', () => {
  it('creates a category with defaults', () => {
    const before = new Date('2023-01-01T00:00:00.000Z')
    vi.setSystemTime(before)
    const category = Category.create({ ...baseInput })
    expect(category.id).toBe('cat-001')
    expect(category.name).toBe('Research')
    expect(category.color).toBe('#0ea5e9')
    expect(category.icon).toBeUndefined()
    expect(category.description).toBeUndefined()
    expect(category.createdAt.getTime()).toBe(before.getTime())
    expect(category.updatedAt.getTime()).toBe(before.getTime())
  })

  it('normalizes input values', () => {
    const category = Category.create({
      id: ' cat-002 ',
      name: '  Strategy  ',
      color: '#F97316',
      icon: ' 🚀 ',
      description: '   Focused missions  ',
    })
    expect(category.id).toBe(' cat-002 ')
    expect(category.name).toBe('Strategy')
    expect(category.color).toBe('#f97316')
    expect(category.icon).toBe('🚀')
    expect(category.description).toBe('Focused missions')
  })

  it('renames and updates timestamp', () => {
    const category = createBaseCategory()
    const previousUpdatedAt = category.updatedAt.getTime()
    vi.setSystemTime(new Date(previousUpdatedAt + 1000))
    category.rename('Exploration')
    expect(category.name).toBe('Exploration')
    expect(category.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt)
  })

  it('throws when name is empty', () => {
    const category = createBaseCategory()
    expect(() => category.rename('')).toThrow(ValidationError)
  })
})

describe('Category mutations', () => {
  it('updates description with validation', () => {
    const category = createBaseCategory()
    category.describe('New description')
    expect(category.description).toBe('New description')
    category.describe('     ')
    expect(category.description).toBeUndefined()
  })

  it('rejects overly long description', () => {
    const category = createBaseCategory()
    expect(() => category.describe('a'.repeat(401))).toThrow(ValidationError)
  })

  it('changes color with validation', () => {
    const category = createBaseCategory()
    category.recolor('#22c55e')
    expect(category.color).toBe('#22c55e')
    expect(() => category.recolor('not-color')).toThrow(ValidationError)
  })

  it('updates icon with validation', () => {
    const category = createBaseCategory()
    category.setIcon('⚡️')
    expect(category.icon).toBe('⚡️')
    expect(() => category.setIcon('a'.repeat(50))).toThrow(ValidationError)
  })
})
