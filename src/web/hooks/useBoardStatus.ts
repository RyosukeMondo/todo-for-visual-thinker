import { useCallback, useEffect, useState } from 'react'

import type { BoardStatusDTO } from '@shared/types/board'

export type UseBoardStatusResult = Readonly<{
  data?: BoardStatusDTO
  isLoading: boolean
  error?: string
  reload: () => Promise<void>
}>

export const useBoardStatus = (): UseBoardStatusResult => {
  const [data, setData] = useState<BoardStatusDTO>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/status')
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }
      const payload = (await response.json()) as BoardStatusDTO
      setData(payload)
      setError(undefined)
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : 'Unknown error loading board status'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return {
    data,
    isLoading,
    error,
    reload: load,
  }
}
