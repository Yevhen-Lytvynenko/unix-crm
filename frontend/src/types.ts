export type TaskPriority = 'Low' | 'Normal' | 'High' | 'Urgent'

export type TagDto = {
  id: string
  name: string
  color: string | null
  sortOrder: number
}

export type TaskDto = {
  id: string
  columnId: string
  title: string
  description: string | null
  assigneeId: string | null
  position: number
  priority: TaskPriority
  dueDateUtc: string | null
  tags: TagDto[]
  blockerTaskIds: string[]
}

export type ColumnDto = {
  id: string
  boardId: string
  title: string
  position: number
  isCompletionColumn: boolean
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

export type DashboardBoardSummaryDto = {
  id: string
  title: string
  taskCount: number
}

export type DashboardOverviewDto = {
  boardCount: number
  columnCount: number
  taskCount: number
  tagCount: number
  userCount: number | null
  tasksLow: number
  tasksNormal: number
  tasksHigh: number
  tasksUrgent: number
  overdueCount: number
  dueWithin7DaysCount: number
  unassignedCount: number
  tasksWithBlockersCount: number
  dependencyLinkCount: number
  boards: DashboardBoardSummaryDto[]
}

export type TaskMovePayload = {
  taskId: string
  newColumnId: string
  newPosition: number
}

export type LoginResponse = {
  token: string
  expiresAtUtc: string
  mustChangePassword: boolean
}

export type MeResponse = {
  id: string
  username: string
  mustChangePassword: boolean
  role: string
}

export type UserAdminDto = {
  id: string
  username: string
  mustChangePassword: boolean
  role: string
}

export type SystemInfoDto = {
  version: string
  releaseDate: string
  changelog: string
}

export type BoardFilters = {
  assigneeId: string
  tagId: string
  priority: string
  dueFrom: string
  dueTo: string
}
