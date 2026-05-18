import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { fetchAdminUsers, fetchBoard, fetchBoardSummaries, fetchTags } from '../api'
import { getStoredBoardId, setStoredBoardId } from '../boardStorage'
import { CardModal } from '../components/CardModal'
import { DependencyGraphView } from '../components/DependencyGraphView'
import { useKanbanHub } from '../useKanbanHub'
import type { TaskDto } from '../types'

const EMPTY_FILTERS = {
  assigneeId: '',
  tagId: '',
  priority: '',
  dueFrom: '',
  dueTo: '',
}

export function DependenciesGraphPage() {
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined)
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null)

  const boardsQuery = useQuery({ queryKey: ['boards'], queryFn: fetchBoardSummaries })
  const firstId = useMemo(() => boardsQuery.data?.[0]?.id, [boardsQuery.data])
  const boardId = selectedBoardId ?? firstId

  const boardFullQuery = useQuery({
    queryKey: ['board', boardId, 'all'],
    queryFn: () => fetchBoard(boardId!, EMPTY_FILTERS),
    enabled: Boolean(boardId),
  })

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: fetchTags })
  const usersQuery = useQuery({ queryKey: ['adminUsers'], queryFn: fetchAdminUsers })

  useKanbanHub(boardId)

  useEffect(() => {
    const stored = getStoredBoardId()
    if (stored && boardsQuery.data?.some((b) => b.id === stored)) {
      setSelectedBoardId(stored)
      return
    }
    if (!selectedBoardId && firstId) setSelectedBoardId(firstId)
  }, [boardsQuery.data, firstId, selectedBoardId])

  const boardFull = boardFullQuery.data

  if (boardsQuery.isPending) {
    return (
      <div className="view-root center-message">
        <p className="muted">Загрузка досок…</p>
      </div>
    )
  }
  if (boardsQuery.isError) {
    return (
      <div className="view-root center-message">
        <p className="error">{(boardsQuery.error as Error).message}</p>
      </div>
    )
  }
  if (!boardsQuery.data?.length) {
    return (
      <div className="view-root center-message">
        <p className="muted">Нет досок.</p>
      </div>
    )
  }

  return (
    <div className="view-root deps-graph-page">
      <header className="deps-graph-toolbar board-slim-toolbar">
        <label className="toolbar-field">
          <span className="toolbar-label">Доска</span>
          <select
            value={boardId ?? ''}
            onChange={(e) => {
              const v = e.target.value || undefined
              setSelectedBoardId(v)
              setStoredBoardId(v ?? null)
            }}
          >
            {boardsQuery.data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <span className="board-title-chip">{boardFull?.title ?? '…'}</span>
        <span className="deps-graph-badge muted small">Граф зависимостей</span>
      </header>

      <div className="board-canvas deps-graph-canvas">
        {boardFullQuery.isPending && (
          <div className="center-message">
            <p className="muted">Загрузка…</p>
          </div>
        )}
        {boardFullQuery.isError && (
          <div className="center-message">
            <p className="error" role="alert">
              {(boardFullQuery.error as Error).message}
            </p>
          </div>
        )}
        {boardFull && boardId && !boardFullQuery.isPending && (
          <DependencyGraphView board={boardFull} boardId={boardId} onOpenTask={setActiveTask} />
        )}
      </div>

      {activeTask && boardFull && boardId && (
        <CardModal
          task={activeTask}
          board={boardFull}
          tags={tagsQuery.data ?? []}
          users={usersQuery.data ?? []}
          boardId={boardId}
          onClose={() => setActiveTask(null)}
        />
      )}
    </div>
  )
}
