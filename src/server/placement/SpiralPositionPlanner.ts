import type { CanvasPosition, Todo } from '@core/domain/Todo'

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const BASE_RADIUS = 200
const RADIUS_STEP = 48
const MAX_RADIUS = 5000

export const planSpiralPosition = (existing: readonly Todo[]): CanvasPosition => {
  if (existing.length === 0) {
    return { x: 0, y: 0 }
  }
  const index = existing.length
  const angle = index * GOLDEN_ANGLE
  const radius = Math.min(
    MAX_RADIUS,
    BASE_RADIUS + Math.sqrt(index) * RADIUS_STEP,
  )
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
  }
}
