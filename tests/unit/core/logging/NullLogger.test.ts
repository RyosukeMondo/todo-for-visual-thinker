import { describe, expect, it } from 'vitest'

import { NullLogger } from '@/shared/logging'

describe('NullLogger', () => {
  it('exposes noop log methods', () => {
    const logger = new NullLogger()
    expect(() => logger.debug('event')).not.toThrow()
    expect(() => logger.info('event')).not.toThrow()
    expect(() => logger.warn('event')).not.toThrow()
    expect(() => logger.error('event')).not.toThrow()
    expect(() => logger.log({ level: 'info', event: 'noop' })).not.toThrow()
  })
})
