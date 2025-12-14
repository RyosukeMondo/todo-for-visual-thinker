import { ValidationError } from '@core/errors'

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i
const MAX_NAME_LENGTH = 60
const MAX_DESCRIPTION_LENGTH = 400
const MAX_ICON_TOKEN_LENGTH = 40
const DEFAULT_CATEGORY_COLOR = '#475569'

export interface CategoryProps {
  id: string
  name: string
  color: string
  icon?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export type CreateCategoryInput = Readonly<{
  id: string
  name: string
  color?: string
  icon?: string
  description?: string
  createdAt?: Date
}>

export class Category {
  private constructor(private readonly props: CategoryProps) {
    this.ensureConsistency()
  }

  static create(input: CreateCategoryInput): Category {
    const createdAt = input.createdAt ?? new Date()
    const category = new Category({
      id: input.id,
      name: input.name.trim(),
      color: (input.color ?? DEFAULT_CATEGORY_COLOR).toLowerCase(),
      icon: normalizeIcon(input.icon),
      description: normalizeDescription(input.description),
      createdAt,
      updatedAt: createdAt,
    })
    return category
  }

  static restore(props: CategoryProps): Category {
    return new Category({
      ...props,
      name: props.name.trim(),
      color: props.color.toLowerCase(),
      icon: normalizeIcon(props.icon),
      description: normalizeDescription(props.description),
    })
  }

  get id(): string {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get color(): string {
    return this.props.color
  }

  get icon(): string | undefined {
    return this.props.icon
  }

  get description(): string | undefined {
    return this.props.description
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  rename(nextName: string): void {
    const trimmed = nextName.trim()
    if (trimmed === this.props.name) return
    this.assertName(trimmed)
    this.props.name = trimmed
    this.touch()
  }

  describe(text: string | undefined): void {
    const normalized = normalizeDescription(text)
    if (normalized === this.props.description) return
    if (normalized) {
      this.assertDescription(normalized)
      this.props.description = normalized
    } else {
      this.props.description = undefined
    }
    this.touch()
  }

  recolor(nextColor: string): void {
    const normalized = nextColor.toLowerCase()
    this.assertColor(normalized)
    if (normalized === this.props.color) return
    this.props.color = normalized
    this.touch()
  }

  setIcon(icon: string | undefined): void {
    const normalized = normalizeIcon(icon)
    if (normalized === this.props.icon) return
    if (normalized) {
      this.assertIcon(normalized)
      this.props.icon = normalized
    } else {
      this.props.icon = undefined
    }
    this.touch()
  }

  toJSON(): CategoryProps {
    return {
      ...this.props,
    }
  }

  private ensureConsistency(): void {
    this.assertId(this.props.id)
    this.assertName(this.props.name)
    this.assertColor(this.props.color)
    if (this.props.description) {
      this.assertDescription(this.props.description)
    }
    if (this.props.icon) {
      this.assertIcon(this.props.icon)
    }
  }

  private assertId(id: string): void {
    if (!id || !id.trim()) {
      throw new ValidationError('Category id is required')
    }
  }

  private assertName(name: string): void {
    if (!name) {
      throw new ValidationError('Category name is required')
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationError('Category name exceeds maximum length', {
        max: MAX_NAME_LENGTH,
      })
    }
  }

  private assertDescription(description: string): void {
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError('Category description exceeds maximum length', {
        max: MAX_DESCRIPTION_LENGTH,
      })
    }
  }

  private assertColor(color: string): void {
    if (!HEX_COLOR_REGEX.test(color)) {
      throw new ValidationError('Category color must be a hex code', { color })
    }
  }

  private assertIcon(icon: string): void {
    if (icon.length > MAX_ICON_TOKEN_LENGTH) {
      throw new ValidationError('Category icon label exceeds maximum length', {
        max: MAX_ICON_TOKEN_LENGTH,
      })
    }
    if (icon.length === 0) {
      throw new ValidationError('Category icon label cannot be empty')
    }
  }

  private touch(): void {
    this.props.updatedAt = new Date()
    this.ensureConsistency()
  }
}

function normalizeIcon(icon: string | undefined): string | undefined {
  if (!icon) return undefined
  const trimmed = icon.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeDescription(text: string | undefined): string | undefined {
  if (!text) return undefined
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  return trimmed
}

export { DEFAULT_CATEGORY_COLOR }
