import { useCallback, useEffect, useState } from 'react'

import type { BoardSnapshotDTO } from '@shared/types/board'

import type {
  TaskBoardRelationship,
  TaskBoardTask,
} from '../components/TaskBoard'
import { transformSnapshot } from '../utils/boardData'

type BoardData = Readonly<{
  tasks: TaskBoardTask[]
  relationships: TaskBoardRelationship[]
  totals: BoardSnapshotDTO['totals']
}>

export type UseBoardDataResult = Readonly<{
  data?: BoardData
  isLoading: boolean
  error?: string
  reload: () => void
}>

export const useBoardData = (): UseBoardDataResult => {
  const [data, setData] = useState<BoardData>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/board')
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }
      const payload = (await response.json()) as BoardSnapshotDTO
      setData(transformSnapshot(payload))
      setError(undefined)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Unknown error loading board data'
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
