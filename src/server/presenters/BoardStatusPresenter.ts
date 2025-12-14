import type { BoardStatusSnapshot } from '@core/usecases/GetBoardStatus'
import type { BoardStatusDTO } from '@shared/types/board'

export class BoardStatusPresenter {
  present(snapshot: BoardStatusSnapshot): BoardStatusDTO {
    return {
      statuses: snapshot.statuses,
      priorities: snapshot.priorities,
      categories: snapshot.categories,
      totals: {
        total: snapshot.total,
        active: snapshot.active,
        completed: snapshot.completed,
        completionRate: Number(snapshot.completionRate.toFixed(4)),
        lastUpdatedAt: snapshot.lastUpdatedAt?.toISOString(),
        lastCreatedAt: snapshot.lastCreatedAt?.toISOString(),
      },
      dependencies: {
        total: snapshot.dependencies.total,
        byType: snapshot.dependencies.byType,
        dependentTasks: snapshot.dependencies.dependentTasks,
        blockingTasks: snapshot.dependencies.blockingTasks,
        blockedTasks: snapshot.dependencies.blockedTasks,
        brokenCount: snapshot.dependencies.brokenCount,
        brokenRelationships: snapshot.dependencies.brokenRelationships,
      },
    }
  }
}
