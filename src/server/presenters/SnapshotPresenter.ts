import type { Todo } from '@core/domain/Todo'
import type { Relationship } from '@core/domain/Relationship'
import type { BoardSnapshot } from '@core/usecases/GetBoardSnapshot'
import type {
  BoardRelationshipDTO,
  BoardSnapshotDTO,
  BoardTaskDTO,
} from '@shared/types/board'

export class SnapshotPresenter {
  present(snapshot: BoardSnapshot): BoardSnapshotDTO {
    const tasks = snapshot.tasks.map((todo) => this.toTaskDto(todo))
    const taskColorMap = new Map(tasks.map((task) => [task.id, task.color]))
    const relationships = snapshot.relationships.map((relationship) =>
      this.toRelationshipDto(relationship, taskColorMap),
    )
    return {
      tasks,
      relationships,
      totals: snapshot.totals,
      viewport: snapshot.viewport,
    }
  }

  private toTaskDto(todo: Todo): BoardTaskDTO {
    return {
      id: todo.id,
      title: todo.title,
      description: todo.description,
      status: todo.status,
      priority: todo.priority,
      category: todo.category,
      color: todo.color,
      icon: todo.icon,
      position: todo.position,
      visualSize: todo.visualSize,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
      completedAt: todo.completedAt?.toISOString(),
    }
  }

  private toRelationshipDto(
    relationship: Relationship,
    colorMap: Map<string, string>,
  ): BoardRelationshipDTO {
    return {
      id: relationship.id,
      fromId: relationship.fromId,
      toId: relationship.toId,
      type: relationship.type,
      color: colorMap.get(relationship.fromId),
    }
  }
}
