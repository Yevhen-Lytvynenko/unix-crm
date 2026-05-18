import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  createColumn,
  createTask,
  deleteColumn,
  deleteTask,
  fetchAdminUsers,
  fetchBoard,
  fetchBoardSummaries,
  fetchTags,
  updateColumn,
} from '../api'
import { getStoredBoardId, setStoredBoardId } from '../boardStorage'
import { CardModal } from '../components/CardModal'
import { KanbanBoard } from '../components/KanbanBoard'
import { useKanbanHub } from '../useKanbanHub'
import type { BoardFilters, ColumnDto, TaskDto } from '../types'

const EMPTY_FILTERS: BoardFilters = {
  assigneeId: '',
  tagId: '',
  priority: '',
  dueFrom: '',
  dueTo: '',
}

export function BoardPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<BoardFilters>(() => ({ ...EMPTY_FILTERS }))
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined)
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null)
  const [columnEditor, setColumnEditor] = useState<ColumnDto | null>(null)
  const [colTitle, setColTitle] = useState('')
  const [colCompletion, setColCompletion] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const boardsQuery = useQuery({ queryKey: ['boards'], queryFn: fetchBoardSummaries })
  const firstId = useMemo(() => boardsQuery.data?.[0]?.id, [boardsQuery.data])
  const boardId = selectedBoardId ?? firstId

  const boardQuery = useQuery({
    queryKey: ['board', boardId, filters],
    queryFn: () => fetchBoard(boardId!, filters),
    enabled: Boolean(boardId),
  })

  const boardAllQuery = useQuery({
    queryKey: ['board', boardId, 'all'],
    queryFn: () => fetchBoard(boardId!, { ...EMPTY_FILTERS }),
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

  const createTaskMutation = useMutation({
    mutationFn: (vars: { columnId: string; title: string }) =>
      createTask({ boardId: boardId!, columnId: vars.columnId, title: vars.title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const createColumnMutation = useMutation({
    mutationFn: (title: string) => createColumn(boardId!, title.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const saveColumnMutation = useMutation({
    mutationFn: async () => {
      if (!columnEditor) return
      await updateColumn(columnEditor.id, { title: colTitle.trim(), isCompletionColumn: colCompletion })
    },
    onSuccess: async () => {
      setColumnEditor(null)
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const deleteColumnMutation = useMutation({
    mutationFn: (id: string) => deleteColumn(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const board = boardQuery.data
  const boardFull = boardAllQuery.data
  const boardTitle = boardFull?.title ?? board?.title ?? '…'

  const filterActive =
    Boolean(filters.assigneeId || filters.tagId || filters.priority || filters.dueFrom || filters.dueTo)

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
        <p className="muted">Нет досок. Запустите API и сидер.</p>
      </div>
    )
  }

  return (
    <div className="view-root board-view board-view-trello">
      <header className="board-slim-toolbar">
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
        <span className="board-title-chip">{boardTitle}</span>
        <button
          type="button"
          className={`btn-ghost btn-compact filters-trigger ${filterActive ? 'has-filters' : ''}`}
          onClick={() => setFiltersOpen(true)}
        >
          Фильтры{filterActive ? ' •' : ''}
        </button>
      </header>

      <div className="board-canvas">
        {boardQuery.isPending && (
          <div className="center-message">
            <p className="muted">Загрузка доски…</p>
          </div>
        )}
        {boardQuery.isError && (
          <div className="center-message">
            <p className="error" role="alert">
              {(boardQuery.error as Error).message}
            </p>
          </div>
        )}

        {board && boardId && !boardQuery.isPending && (
          <div className="board-scroll-outer">
            <div className="board-scroll-inner">
              <KanbanBoard
                boardId={boardId}
                board={board}
                onTaskOpen={setActiveTask}
                onDeleteTask={(task) => {
                  if (window.confirm(`Удалить карточку «${task.title}»?`)) {
                    deleteTaskMutation.mutate(task.id)
                  }
                }}
                onAddCard={(columnId, title) => createTaskMutation.mutate({ columnId, title })}
                addCardPending={createTaskMutation.isPending}
                onCreateColumn={(title) => createColumnMutation.mutate(title)}
                createColumnPending={createColumnMutation.isPending}
                onEditColumn={(col) => {
                  setColumnEditor(col)
                  setColTitle(col.title)
                  setColCompletion(col.isCompletionColumn)
                }}
                onDeleteColumn={(col) => {
                  if (window.confirm(`Удалить колонку «${col.title}»? Задачи будут перенесены.`)) {
                    deleteColumnMutation.mutate(col.id)
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {filtersOpen && (
        <div
          className="modal-backdrop filters-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFiltersOpen(false)
          }}
        >
          <div
            className="modal-floating-panel glass-panel filters-sheet"
            role="dialog"
            aria-modal
            aria-labelledby="filters-sheet-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="filters-sheet-title">Фильтры</h2>
              <button type="button" className="icon-btn" onClick={() => setFiltersOpen(false)} aria-label="Закрыть">
                ×
              </button>
            </header>
            <div className="modal-body filters-sheet-body">
              <label className="field">
                <span>Исполнитель</span>
                <select
                  value={filters.assigneeId}
                  onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
                >
                  <option value="">Все</option>
                  {usersQuery.data?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Тег</span>
                <select value={filters.tagId} onChange={(e) => setFilters((f) => ({ ...f, tagId: e.target.value }))}>
                  <option value="">Все</option>
                  {tagsQuery.data?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Приоритет</span>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
                >
                  <option value="">Любой</option>
                  {['Low', 'Normal', 'High', 'Urgent'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Срок от</span>
                <input
                  type="date"
                  value={filters.dueFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dueFrom: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Срок по</span>
                <input
                  type="date"
                  value={filters.dueTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dueTo: e.target.value }))}
                />
              </label>
            </div>
            <footer className="modal-footer">
              <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS })}>
                Сброс
              </button>
              <button type="button" className="btn-primary" onClick={() => setFiltersOpen(false)}>
                Готово
              </button>
            </footer>
          </div>
        </div>
      )}

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

      {columnEditor && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setColumnEditor(null)
          }}
        >
          <div className="modal-floating-panel glass-panel" role="dialog" aria-modal onMouseDown={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Колонка</h2>
              <button type="button" className="icon-btn" onClick={() => setColumnEditor(null)}>
                ×
              </button>
            </header>
            <div className="modal-body">
              <label className="field">
                <span>Название</span>
                <input value={colTitle} onChange={(e) => setColTitle(e.target.value)} />
              </label>
              <label className="field row">
                <input
                  type="checkbox"
                  checked={colCompletion}
                  onChange={(e) => setColCompletion(e.target.checked)}
                />
                <span>Колонка завершения (Done)</span>
              </label>
            </div>
            <footer className="modal-footer">
              <button type="button" onClick={() => setColumnEditor(null)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => saveColumnMutation.mutate()}
                disabled={saveColumnMutation.isPending}
              >
                Сохранить
              </button>
            </footer>
            {saveColumnMutation.isError && (
              <p className="error modal-error">{(saveColumnMutation.error as Error).message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
