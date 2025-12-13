export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export type DomainErrorData = {
  code: string
  message: string
  context?: Record<string, unknown>
}
