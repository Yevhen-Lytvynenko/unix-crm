import type { BoardDetailDto } from './types'

const columnDroppablePrefix = 'Column:'

export function isColumnDropId(overId: string): boolean {
  return overId.startsWith(columnDroppablePrefix)
}

export function parseColumnDropId(overId: string): string {
  return overId.slice(columnDroppablePrefix.length)
}

export function columnDropId(columnId: string): string {
  return `${columnDroppablePrefix}${columnId}`
}

/**
 * Computes server indices after a drop. Clones column task-id lists, removes the active task,
 * then inserts it into the target column at the resolved index.
 */
export function computeTaskMove(
  board: BoardDetailDto,
  activeTaskId: string,
  overId: string,
):
  | {
      newColumnId: string
      newPosition: number
    }
  | null {
  const columns = board.columns
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      taskIds: c.tasks
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((t) => t.id),
    }))

  const fromColumn = columns.find((col) => col.taskIds.includes(activeTaskId))
  if (!fromColumn) return null

  const fromIndex = fromColumn.taskIds.indexOf(activeTaskId)
  fromColumn.taskIds.splice(fromIndex, 1)

  let targetColumnId: string
  let insertAt: number

  if (isColumnDropId(overId)) {
    targetColumnId = parseColumnDropId(overId)
    const col = columns.find((c) => c.id === targetColumnId)
    if (!col) return null
    insertAt = col.taskIds.length
  } else {
    const col = columns.find((c) => c.taskIds.includes(overId))
    if (!col) return null
    targetColumnId = col.id
    insertAt = col.taskIds.indexOf(overId)
    if (fromColumn.id === col.id && fromIndex < insertAt) {
      insertAt += 1
    }
  }

  const targetCol = columns.find((c) => c.id === targetColumnId)
  if (!targetCol) return null

  targetCol.taskIds.splice(insertAt, 0, activeTaskId)

  return { newColumnId: targetColumnId, newPosition: insertAt }
}
