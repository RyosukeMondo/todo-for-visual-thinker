import { DomainError } from './DomainError'

export class TodoNotFoundError extends DomainError {
  constructor(ids: string | string[]) {
    const missingIds = (Array.isArray(ids) ? ids : [ids]).map((value) => value.trim())
    const unique = Array.from(new Set(missingIds))
    const message =
      unique.length === 1
        ? `Todo not found: ${unique[0]}`
        : `Todos not found: ${unique.join(', ')}`

    super(message, 'TODO_NOT_FOUND', { ids: unique })
  }
}
