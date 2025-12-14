import type { Command } from 'commander'

import type { TodoPriority, TodoStatus } from '@core/domain/Todo'
import type { GetBoardSnapshot } from '@core/usecases/GetBoardSnapshot'
import {
  buildTaskHierarchy,
  type TaskHierarchyNode,
} from '@shared/utils/taskHierarchy'

import type { CliIO } from '../io'
import { writeJson } from '../io'
import { serializeError } from '../serializers'

export type HierarchyCommandDependencies = Readonly<{
  getBoardSnapshot: Pick<GetBoardSnapshot, 'execute'>
}>

type HierarchyTaskView = Readonly<{
  id: string
  title: string
  priority: TodoPriority
  status: TodoStatus
  category?: string
  icon?: string
}>

type HierarchyNodeView = Readonly<{
  id: string
  depth: number
  task: HierarchyTaskView
  children: HierarchyNodeView[]
}>

export const registerHierarchyCommand = (
  program: Command,
  deps: HierarchyCommandDependencies,
  io: CliIO,
): void => {
  program
    .command('hierarchy')
    .description('Render parent-child flows using parent_of relationships')
    .action(async () => {
      await handleHierarchyAction(deps, io)
    })
}

const handleHierarchyAction = async (
  deps: HierarchyCommandDependencies,
  io: CliIO,
): Promise<void> => {
  try {
    const snapshot = await deps.getBoardSnapshot.execute()
    const tasks = snapshot.tasks.map<HierarchyTaskView>((todo) => ({
      id: todo.id,
      title: todo.title,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      icon: todo.icon,
    }))
    const hierarchy = buildTaskHierarchy(tasks, snapshot.relationships, {
      relationshipType: 'parent_of',
    }).map((node) => serializeHierarchyNode(node))

    writeJson(io.stdout, {
      success: true,
      data: {
        totals: {
          roots: hierarchy.length,
          tasks: tasks.length,
          relationships: snapshot.relationships.length,
        },
        hierarchy,
        outline: formatOutline(hierarchy),
      },
    })
  } catch (error) {
    writeJson(io.stderr, {
      success: false,
      error: serializeError(error),
    })
    process.exitCode = 1
  }
}

const serializeHierarchyNode = (
  node: TaskHierarchyNode<HierarchyTaskView>,
): HierarchyNodeView => ({
  id: node.id,
  depth: node.depth,
  task: node.task,
  children: node.children.map((child) => serializeHierarchyNode(child)),
})

const formatOutline = (nodes: HierarchyNodeView[]): string[] => {
  const lines: string[] = []
  nodes.forEach((node) => {
    appendOutline(node, lines)
  })
  return lines
}

const appendOutline = (node: HierarchyNodeView, lines: string[]): void => {
  const indent = '  '.repeat(node.depth)
  const badge = `${node.task.status} · P${node.task.priority}`
  const category = node.task.category ? ` [${node.task.category}]` : ''
  const icon = node.task.icon ? `${node.task.icon} ` : ''
  lines.push(`${indent}- ${icon}${node.task.title} (${badge})${category}`)
  node.children.forEach((child) => appendOutline(child, lines))
}
