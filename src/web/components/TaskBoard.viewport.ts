import {
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

type ViewportState = Readonly<{
  x: number
  y: number
  scale: number
}>

export type ViewportController = Readonly<{
  viewport: ViewportState
  isPanning: boolean
  handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  handlePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  handlePointerLeave: () => void
  handleWheel: (event: WheelEvent<HTMLDivElement>) => void
  zoomIn: () => void
  zoomOut: () => void
  panBy: (deltaX: number, deltaY: number) => void
  reset: () => void
}>

const MIN_SCALE = 0.6
const MAX_SCALE = 1.8
const SCALE_STEP = 0.15

type DragSession = Readonly<{
  pointerId: number
  originX: number
  originY: number
  startX: number
  startY: number
}>

export const useViewportController = (
  initialViewport: Partial<ViewportState> | undefined,
  onViewportChange?: (viewport: ViewportState) => void,
): ViewportController => {
  const { viewport, setViewport, viewportRef } = useViewportState(
    initialViewport,
    onViewportChange,
  )

  const pan = usePanHandlers(setViewport, viewportRef)
  const handleWheel = useWheelHandler(setViewport)
  const { zoomIn, zoomOut } = useZoomControls(setViewport)
  const panBy = usePanTranslation(setViewport)
  const reset = useResetViewport(initialViewport, setViewport)

  return {
    viewport,
    isPanning: pan.isPanning,
    handlePointerDown: pan.handlePointerDown,
    handlePointerMove: pan.handlePointerMove,
    handlePointerUp: pan.handlePointerUp,
    handlePointerLeave: pan.handlePointerLeave,
    handleWheel,
    zoomIn,
    zoomOut,
    panBy,
    reset,
  }
}

const useViewportState = (
  initialViewport: Partial<ViewportState> | undefined,
  onViewportChange?: (viewport: ViewportState) => void,
): {
  viewport: ViewportState
  setViewport: Dispatch<SetStateAction<ViewportState>>
  viewportRef: MutableRefObject<ViewportState>
} => {
  const [viewport, setViewport] = useState<ViewportState>(() =>
    normalizeViewport(initialViewport),
  )
  const viewportRef = useRef(viewport)

  useEffect(() => {
    viewportRef.current = viewport
    onViewportChange?.(viewport)
  }, [viewport, onViewportChange])

  return { viewport, setViewport, viewportRef }
}

const useWheelHandler = (
  setViewport: Dispatch<SetStateAction<ViewportState>>,
) =>
  useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY > 0 ? -1 : 1
    setViewport((current) => ({
      ...current,
      scale: clampScale(current.scale + direction * SCALE_STEP),
    }))
  }, [setViewport])

const useZoomControls = (
  setViewport: Dispatch<SetStateAction<ViewportState>>,
) => {
  const adjustScale = useCallback((delta: number) => {
    setViewport((current) => ({
      ...current,
      scale: clampScale(current.scale + delta),
    }))
  }, [setViewport])

  const zoomIn = useCallback(() => adjustScale(SCALE_STEP), [adjustScale])
  const zoomOut = useCallback(() => adjustScale(-SCALE_STEP), [adjustScale])

  return { zoomIn, zoomOut }
}

const usePanTranslation = (
  setViewport: Dispatch<SetStateAction<ViewportState>>,
) =>
  useCallback((deltaX: number, deltaY: number) => {
    setViewport((current) => ({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY,
    }))
  }, [setViewport])

const useResetViewport = (
  initialViewport: Partial<ViewportState> | undefined,
  setViewport: Dispatch<SetStateAction<ViewportState>>,
) =>
  useCallback(() => {
    setViewport(normalizeViewport(initialViewport))
  }, [initialViewport, setViewport])

const usePanHandlers = (
  setViewport: Dispatch<SetStateAction<ViewportState>>,
  viewportRef: MutableRefObject<ViewportState>,
) => {
  const [isPanning, setIsPanning] = useState(false)
  const dragSession = useRef<DragSession | null>(null)

  const startPan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      dragSession.current = buildDragSession(event, viewportRef.current)
      setIsPanning(true)
    },
    [viewportRef],
  )

  const movePan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const session = dragSession.current
      if (!session || session.pointerId !== event.pointerId) return
      event.preventDefault()
      applyPanDelta(setViewport, session, event.clientX, event.clientY)
    },
    [setViewport],
  )

  const endPan = useCallback(
    (event?: ReactPointerEvent<HTMLDivElement>) => {
      if (event && dragSession.current?.pointerId === event.pointerId) {
        event.currentTarget.releasePointerCapture?.(event.pointerId)
      }
      dragSession.current = null
      setIsPanning(false)
    },
    [],
  )

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragSession.current?.pointerId !== event.pointerId) return
      endPan(event)
    },
    [endPan],
  )

  return {
    isPanning,
    handlePointerDown: startPan,
    handlePointerMove: movePan,
    handlePointerUp,
    handlePointerLeave: () => endPan(),
  }
}

const buildDragSession = (
  event: ReactPointerEvent<HTMLDivElement>,
  viewport: ViewportState,
): DragSession => ({
  pointerId: event.pointerId,
  originX: event.clientX,
  originY: event.clientY,
  startX: viewport.x,
  startY: viewport.y,
})

const applyPanDelta = (
  setViewport: Dispatch<SetStateAction<ViewportState>>,
  session: DragSession,
  clientX: number,
  clientY: number,
): void => {
  const deltaX = clientX - session.originX
  const deltaY = clientY - session.originY
  setViewport((current) => ({
    ...current,
    x: session.startX + deltaX,
    y: session.startY + deltaY,
  }))
}

const normalizeViewport = (
  viewport: Partial<ViewportState> | undefined,
): ViewportState => ({
  x: viewport?.x ?? 0,
  y: viewport?.y ?? 0,
  scale: clampScale(viewport?.scale ?? 1),
})

const clampScale = (value: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number.parseFloat(value.toFixed(4))))

export type { ViewportState }
