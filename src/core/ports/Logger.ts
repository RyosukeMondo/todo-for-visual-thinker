export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Readonly<Record<string, unknown>>

export type LogEntry = Readonly<{
  level: LogLevel
  event: string
  message?: string
  service?: string
  timestamp?: Date
  context?: LogContext
}>

export interface Logger {
  log(entry: LogEntry): void
  debug(event: string, context?: LogContext): void
  info(event: string, context?: LogContext): void
  warn(event: string, context?: LogContext): void
  error(event: string, context?: LogContext): void
}
