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
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  const parentByChild = new Map<string, string>()
  const childrenByParent = new Map<string, Set<string>>()

  relationships.forEach((relationship) => {
    if (relationship.type !== targetType) {
      return
    }
    const parentId = relationship.fromId.trim()
    const childId = relationship.toId.trim()
    if (!tasksById.has(parentId) || !tasksById.has(childId)) {
      return
    }
    if (parentId === childId) {
      return
    }
    if (wouldCreateCycle(parentId, childId, parentByChild)) {
      return
    }

    parentByChild.set(childId, parentId)
    const children = childrenByParent.get(parentId) ?? new Set<string>()
    children.add(childId)
    childrenByParent.set(parentId, children)
  })

  const orderedTasks = [...tasks].sort(compareTasks)
  const attached = new Set<string>()

  const buildNode = (taskId: string, depth: number): TaskHierarchyNode<TTask> => {
    const task = tasksById.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} missing from hierarchy source`)
    }
    attached.add(taskId)
    const childIds = [...(childrenByParent.get(taskId) ?? [])]
    childIds.sort((a, b) => compareTasks(tasksById.get(a)!, tasksById.get(b)!))
    return {
      id: task.id,
      task,
      depth,
      children: childIds.map((childId) => buildNode(childId, depth + 1)),
    }
  }

  const forest: TaskHierarchyNode<TTask>[] = []
  orderedTasks.forEach((task) => {
    if (!parentByChild.has(task.id)) {
      forest.push(buildNode(task.id, 0))
    }
  })

  orderedTasks.forEach((task) => {
    if (!attached.has(task.id)) {
      forest.push(buildNode(task.id, 0))
    }
  })

  return forest
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
