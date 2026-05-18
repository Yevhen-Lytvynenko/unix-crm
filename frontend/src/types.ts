export type TaskDto = {
  id: string
  columnId: string
  title: string
  description: string | null
  assigneeId: string | null
  position: number
}

export type ColumnDto = {
  id: string
  boardId: string
  title: string
  position: number
  tasks: TaskDto[]
}

export type BoardDetailDto = {
  id: string
  title: string
  columns: ColumnDto[]
}

export type BoardSummaryDto = {
  id: string
  title: string
}

export type TaskMovePayload = {
  taskId: string
  newColumnId: string
  newPosition: number
}
