import type {
  TaskBoardRelationship,
  TaskBoardTask,
} from '../components/TaskBoard'
import {
  buildTaskHierarchy as buildSharedHierarchy,
  type TaskHierarchyNode,
} from '@shared/utils/taskHierarchy'

export type { TaskHierarchyNode }

const HIERARCHY_RELATIONSHIP: TaskBoardRelationship['type'] = 'parent_of'

export const buildTaskHierarchy = (
  tasks: readonly TaskBoardTask[],
  relationships: readonly TaskBoardRelationship[] = [],
): TaskHierarchyNode<TaskBoardTask>[] =>
  buildSharedHierarchy(tasks, relationships, {
    relationshipType: HIERARCHY_RELATIONSHIP,
  })
