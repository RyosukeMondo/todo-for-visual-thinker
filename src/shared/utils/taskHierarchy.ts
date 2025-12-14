export type HierarchyTask = Readonly<{
  id: string
  title: string
  priority: number
}>

export type HierarchyRelationship = Readonly<{
  id: string
  fromId: string
  toId: string
  type: string
}>

export type TaskHierarchyNode<TTask extends HierarchyTask> = Readonly<{
  id: string
  task: TTask
  depth: number
  children: TaskHierarchyNode<TTask>[]
}>

export type BuildTaskHierarchyOptions = Readonly<{
  relationshipType?: string
}>

const DEFAULT_RELATIONSHIP_TYPE = 'parent_of'

export const buildTaskHierarchy = <TTask extends HierarchyTask>(
  tasks: readonly TTask[],
  relationships: readonly HierarchyRelationship[] = [],
  options: BuildTaskHierarchyOptions = {},
): TaskHierarchyNode<TTask>[] => {
  if (tasks.length === 0) {
    return []
  }

  const targetType = (options.relationshipType ?? DEFAULT_RELATIONSHIP_TYPE).trim()
  const context = prepareHierarchyContext(tasks, relationships, targetType)
  return buildHierarchyForest(context)
}

type HierarchyContext<TTask extends HierarchyTask> = Readonly<{
  tasksById: Map<string, TTask>
  parentByChild: Map<string, string>
  childrenByParent: Map<string, Set<string>>
  orderedTasks: TTask[]
}>

const prepareHierarchyContext = <TTask extends HierarchyTask>(
  tasks: readonly TTask[],
  relationships: readonly HierarchyRelationship[],
  targetType: string,
): HierarchyContext<TTask> => {
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  const parentByChild = new Map<string, string>()
  const childrenByParent = new Map<string, Set<string>>()

  relationships.forEach((relationship) => {
    if (relationship.type !== targetType) {
      return
    }
    attachRelationship(relationship, { tasksById, parentByChild, childrenByParent })
  })

  return {
    tasksById,
    parentByChild,
    childrenByParent,
    orderedTasks: [...tasks].sort(compareTasks),
  }
}

const attachRelationship = <TTask extends HierarchyTask>(
  relationship: HierarchyRelationship,
  context: {
    tasksById: Map<string, TTask>
    parentByChild: Map<string, string>
    childrenByParent: Map<string, Set<string>>
  },
): void => {
  const parentId = relationship.fromId.trim()
  const childId = relationship.toId.trim()
  if (
    !context.tasksById.has(parentId) ||
    !context.tasksById.has(childId) ||
    parentId === childId ||
    wouldCreateCycle(parentId, childId, context.parentByChild)
  ) {
    return
  }

  context.parentByChild.set(childId, parentId)
  const children = context.childrenByParent.get(parentId) ?? new Set<string>()
  children.add(childId)
  context.childrenByParent.set(parentId, children)
}

const buildHierarchyForest = <TTask extends HierarchyTask>(
  context: HierarchyContext<TTask>,
): TaskHierarchyNode<TTask>[] => {
  const attached = new Set<string>()
  const forest = collectRootNodes(context, attached)
  return attachDetachedNodes(context, attached, forest)
}

const collectRootNodes = <TTask extends HierarchyTask>(
  context: HierarchyContext<TTask>,
  attached: Set<string>,
): TaskHierarchyNode<TTask>[] => {
  const forest: TaskHierarchyNode<TTask>[] = []
  context.orderedTasks.forEach((task) => {
    if (!context.parentByChild.has(task.id)) {
      forest.push(buildNode(task.id, 0, context, attached))
    }
  })
  return forest
}

const attachDetachedNodes = <TTask extends HierarchyTask>(
  context: HierarchyContext<TTask>,
  attached: Set<string>,
  forest: TaskHierarchyNode<TTask>[],
): TaskHierarchyNode<TTask>[] => {
  context.orderedTasks.forEach((task) => {
    if (!attached.has(task.id)) {
      forest.push(buildNode(task.id, 0, context, attached))
    }
  })
  return forest
}

const buildNode = <TTask extends HierarchyTask>(
  taskId: string,
  depth: number,
  context: HierarchyContext<TTask>,
  attached: Set<string>,
): TaskHierarchyNode<TTask> => {
  const task = context.tasksById.get(taskId)
  if (!task) {
    throw new Error(`Task ${taskId} missing from hierarchy source`)
  }
  attached.add(taskId)
  const childIds = [...(context.childrenByParent.get(taskId) ?? [])]
  childIds.sort((a, b) =>
    compareTasks(context.tasksById.get(a)!, context.tasksById.get(b)!),
  )
  return {
    id: task.id,
    task,
    depth,
    children: childIds.map((childId) => buildNode(childId, depth + 1, context, attached)),
  }
}

const wouldCreateCycle = (
  parentId: string,
  childId: string,
  parentByChild: Map<string, string>,
): boolean => {
  let current: string | undefined = parentId
  while (current) {
    if (current === childId) {
      return true
    }
    current = parentByChild.get(current)
  }
  return false
}

const compareTasks = (a: HierarchyTask, b: HierarchyTask): number => {
  if (a.priority !== b.priority) {
    return b.priority - a.priority
  }
  return a.title.localeCompare(b.title)
}
