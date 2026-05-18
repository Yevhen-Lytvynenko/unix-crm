import { getToken, setToken } from './auth'
import { apiUrl } from './apiBase'
import type {
  BoardDetailDto,
  BoardFilters,
  BoardSummaryDto,
  DashboardOverviewDto,
  LoginResponse,
  MeResponse,
  SystemInfoDto,
  TagDto,
  TaskDto,
  UserAdminDto,
} from './types'
import type { TaskPriority } from './types'

function isAuthExempt401Path(input: string): boolean {
  try {
    const path = input.startsWith('http://') || input.startsWith('https://') ? new URL(input).pathname : input
    return path.includes('/api/auth/login') || path.includes('/api/auth/set-password')
  } catch {
    return input.includes('/api/auth/login') || input.includes('/api/auth/set-password')
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error
    }
    return res.statusText
  } catch {
    return res.statusText
  }
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = input.startsWith('http://') || input.startsWith('https://') ? input : apiUrl(input)
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(url, { ...init, headers, credentials: 'include' })
  if (res.status === 401 && !isAuthExempt401Path(url)) {
    setToken(null)
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
  }
  return res
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<LoginResponse>
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await authFetch('/api/auth/me')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<MeResponse>
}

export async function setPasswordRequest(newPassword: string): Promise<void> {
  const res = await authFetch('/api/auth/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

function filtersToQuery(f: BoardFilters): string {
  const q = new URLSearchParams()
  if (f.assigneeId) q.set('assigneeId', f.assigneeId)
  if (f.tagId) q.set('tagId', f.tagId)
  if (f.priority) q.set('priority', f.priority)
  if (f.dueFrom) q.set('dueFrom', f.dueFrom)
  if (f.dueTo) q.set('dueTo', f.dueTo)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewDto> {
  const res = await authFetch('/api/dashboard/overview')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<DashboardOverviewDto>
}

export async function fetchBoardSummaries(): Promise<BoardSummaryDto[]> {
  const res = await authFetch('/api/boards')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<BoardSummaryDto[]>
}

export async function fetchBoard(id: string, filters: BoardFilters): Promise<BoardDetailDto> {
  const res = await authFetch(`/api/boards/${id}${filtersToQuery(filters)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<BoardDetailDto>
}

export async function moveTask(payload: {
  taskId: string
  newColumnId: string
  newPosition: number
}): Promise<void> {
  const res = await authFetch('/api/tasks/move', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: payload.taskId,
      newColumnId: payload.newColumnId,
      newPosition: payload.newPosition,
    }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function createTask(body: {
  boardId: string
  title: string
  columnId?: string | null
  description?: string | null
  assigneeId?: string | null
  priority?: TaskPriority | null
  dueDateUtc?: string | null
  tagIds?: string[] | null
}): Promise<void> {
  const res = await authFetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      boardId: body.boardId,
      title: body.title,
      columnId: body.columnId ?? null,
      description: body.description ?? null,
      assigneeId: body.assigneeId ?? null,
      priority: body.priority ?? null,
      dueDateUtc: body.dueDateUtc ?? null,
      tagIds: body.tagIds ?? null,
    }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function updateTask(
  id: string,
  body: {
    title: string
    description?: string | null
    assigneeId?: string | null
    priority?: TaskPriority | null
    dueDateUtc?: string | null
    tagIds?: string[] | null
  },
): Promise<TaskDto> {
  const res = await authFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<TaskDto>
}

export async function deleteTask(id: string): Promise<void> {
  const res = await authFetch(`/api/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function addDependency(taskId: string, blockerTaskId: string): Promise<void> {
  const res = await authFetch(`/api/tasks/${taskId}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockerTaskId }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function removeDependency(taskId: string, blockerTaskId: string): Promise<void> {
  const res = await authFetch(`/api/tasks/${taskId}/dependencies/${blockerTaskId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function createColumn(boardId: string, title: string): Promise<void> {
  const res = await authFetch('/api/columns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, title }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function updateColumn(
  id: string,
  body: { title?: string; isCompletionColumn?: boolean | null },
): Promise<void> {
  const res = await authFetch(`/api/columns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function deleteColumn(id: string): Promise<void> {
  const res = await authFetch(`/api/columns/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function fetchTags(): Promise<TagDto[]> {
  const res = await authFetch('/api/tags')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<TagDto[]>
}

export async function createTag(name: string, color?: string | null, sortOrder?: number | null): Promise<void> {
  const res = await authFetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color: color ?? null, sortOrder: sortOrder ?? null }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function updateTag(
  id: string,
  body: { name?: string; color?: string | null; sortOrder?: number | null },
): Promise<void> {
  const res = await authFetch(`/api/tags/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function deleteTag(id: string): Promise<void> {
  const res = await authFetch(`/api/tags/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function fetchAdminUsers(): Promise<UserAdminDto[]> {
  const res = await authFetch('/api/admin/users')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<UserAdminDto[]>
}

export async function fetchSystemInfo(): Promise<SystemInfoDto> {
  const res = await authFetch('/api/admin/system-info')
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<SystemInfoDto>
}
