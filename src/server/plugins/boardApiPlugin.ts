import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

import { createRuntime } from '@cli/runtime'
import { SnapshotPresenter } from '@server/presenters/SnapshotPresenter'

export const boardApiPlugin = (): Plugin => {
  return {
    name: 'board-api-plugin',
    configureServer(server) {
      const runtime = createRuntime()
      const presenter = new SnapshotPresenter()

      const handler = async (_req: IncomingMessage, res: ServerResponse) => {
        try {
          const snapshot = await runtime.getBoardSnapshot.execute()
          const payload = presenter.present(snapshot)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        } catch (error) {
          console.error('Board API error', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'BOARD_SNAPSHOT_FAILED' }))
        }
      }

      server.middlewares.use('/api/board', handler)
      server.httpServer?.once('close', () => runtime.shutdown())
    },
  }
}
