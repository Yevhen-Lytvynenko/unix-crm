import type { BoardDetailDto, BoardSummaryDto, TaskMovePayload } from './types'

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

export async function fetchBoardSummaries(): Promise<BoardSummaryDto[]> {
  const res = await fetch('/api/boards', { credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<BoardSummaryDto[]>
}

export async function fetchBoard(id: string): Promise<BoardDetailDto> {
  const res = await fetch(`/api/boards/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<BoardDetailDto>
}

export async function moveTask(payload: TaskMovePayload): Promise<void> {
  const res = await fetch('/api/tasks/move', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: payload.taskId,
      newColumnId: payload.newColumnId,
      newPosition: payload.newPosition,
    }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function createTask(boardId: string, title: string): Promise<void> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, title, description: null, assigneeId: null }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}
