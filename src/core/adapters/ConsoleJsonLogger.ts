import type { LogContext, LogEntry, Logger } from '@core/ports'

export type ConsoleJsonLoggerOptions = Readonly<{
  service?: string
  clock?: () => Date
  stream?: NodeJS.WritableStream
}>

export class ConsoleJsonLogger implements Logger {
  private readonly service?: string
  private readonly clock?: () => Date
  private readonly stream: NodeJS.WritableStream

  constructor(options: ConsoleJsonLoggerOptions = {}) {
    this.service = options.service
    this.clock = options.clock
    this.stream = options.stream ?? process.stderr
  }

  log(entry: LogEntry): void {
    const payload = this.normalizeEntry(entry)
    this.stream.write(`${JSON.stringify(payload)}\n`)
  }

  debug(event: string, context?: LogContext): void {
    this.log({ level: 'debug', event, context })
  }

  info(event: string, context?: LogContext): void {
    this.log({ level: 'info', event, context })
  }

  warn(event: string, context?: LogContext): void {
    this.log({ level: 'warn', event, context })
  }

  error(event: string, context?: LogContext): void {
    this.log({ level: 'error', event, context })
  }

  private normalizeEntry(entry: LogEntry): Record<string, unknown> {
    const timestamp = (entry.timestamp ?? this.clock?.() ?? new Date()).toISOString()
    const payload: Record<string, unknown> = {
      timestamp,
      level: entry.level,
      event: entry.event,
    }

    if (entry.message) {
      payload.message = entry.message
    }

    const service = entry.service ?? this.service
    if (service) {
      payload.service = service
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      payload.context = entry.context
    }

    return payload
  }
}
