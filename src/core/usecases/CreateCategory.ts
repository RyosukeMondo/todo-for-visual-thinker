import { Category } from '@core/domain/Category'
import { ValidationError } from '@core/errors'
import type { CategoryRepository, Logger } from '@core/ports'
import { NullLogger } from '@shared/logging'

export type CreateCategoryInput = Readonly<{
  name: string
  color?: string
  icon?: string
  description?: string
}>

export type CreateCategoryDependencies = Readonly<{
  repository: CategoryRepository
  idGenerator: () => string
  clock?: () => Date
  logger?: Logger
}>

export class CreateCategory {
  private readonly logger: Logger

  constructor(private readonly deps: CreateCategoryDependencies) {
    this.logger = deps.logger ?? new NullLogger()
  }

  async execute(input: CreateCategoryInput): Promise<Category> {
    this.ensureValidName(input.name)
    await this.enforceUniqueName(input.name)
    const category = Category.create({
      id: this.deps.idGenerator(),
      name: input.name,
      color: input.color,
      icon: input.icon,
      description: input.description,
      createdAt: this.deps.clock?.() ?? new Date(),
    })

    await this.deps.repository.save(category)
    this.logCreation(category)
    return category
  }

  private ensureValidName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Category name is required', {
        field: 'name',
      })
    }
  }

  private async enforceUniqueName(name: string): Promise<void> {
    const existing = await this.deps.repository.findByName(name)
    if (existing) {
      throw new ValidationError('Category name already exists', {
        name,
      })
    }
  }

  private logCreation(category: Category): void {
    this.logger.info('category.created', {
      categoryId: category.id,
      name: category.name,
      color: category.color,
    })
  }
}

