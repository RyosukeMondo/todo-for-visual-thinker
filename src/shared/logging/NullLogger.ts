import type { LogContext, LogEntry, Logger } from '@core/ports'

export class NullLogger implements Logger {
  log(_entry: LogEntry): void {}
  debug(_event: string, _context?: LogContext): void {}
  info(_event: string, _context?: LogContext): void {}
  warn(_event: string, _context?: LogContext): void {}
  error(_event: string, _context?: LogContext): void {}
}
