import { DomainError } from './DomainError'

export class ValidationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context)
  }
}
