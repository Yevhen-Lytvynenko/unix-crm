import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KanbanColumn } from './KanbanColumn'
import { computeTaskMove } from '../moveLogic'
import { moveTask } from '../api'
import type { BoardDetailDto, TaskDto } from '../types'

type Props = {
  boardId: string
  board: BoardDetailDto
  onTaskOpen?: (task: TaskDto) => void
  onDeleteTask?: (task: TaskDto) => void
  onEditColumn?: (column: import('../types').ColumnDto) => void
  onDeleteColumn?: (column: import('../types').ColumnDto) => void
  onAddCard: (columnId: string, title: string) => void
  addCardPending?: boolean
  onCreateColumn: (title: string) => void
  createColumnPending?: boolean
}

export function KanbanBoard({
  boardId,
  board,
  onTaskOpen,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
  onAddCard,
  addCardPending,
  onCreateColumn,
  createColumnPending,
}: Props) {
  const queryClient = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const moveMutation = useMutation({
    mutationFn: moveTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const sortedColumns = board.columns.slice().sort((a, b) => a.position - b.position)

  const [columnComposerOpen, setColumnComposerOpen] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) return

    const result = computeTaskMove(board, activeId, overId)
    if (!result) return

    const movedTask = board.columns.flatMap((c) => c.tasks).find((t) => t.id === activeId)
    if (!movedTask) return

    const currentOrder = board.columns
      .find((c) => c.id === movedTask.columnId)!
      .tasks.slice()
      .sort((a, b) => a.position - b.position)
      .map((t) => t.id)
    const currentIndex = currentOrder.indexOf(activeId)

    if (movedTask.columnId === result.newColumnId && currentIndex === result.newPosition) return

    moveMutation.mutate({
      taskId: activeId,
      newColumnId: result.newColumnId,
      newPosition: result.newPosition,
    })
  }

  const submitColumn = () => {
    const t = newColumnTitle.trim()
    if (!t) return
    onCreateColumn(t)
    setNewColumnTitle('')
    setColumnComposerOpen(false)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="kanban-board kanban-board-row">
        {sortedColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onTaskOpen={onTaskOpen}
            onDeleteTask={onDeleteTask}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
            onAddCard={onAddCard}
            addCardPending={addCardPending}
          />
        ))}
        <div className="kanban-add-column">
          {!columnComposerOpen ? (
            <button type="button" className="kanban-add-column-trigger" onClick={() => setColumnComposerOpen(true)}>
              + Добавить колонку
            </button>
          ) : (
            <div className="kanban-add-column-composer">
              <input
                className="kanban-add-column-input"
                placeholder="Название колонки"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                autoFocus
              />
              <div className="kanban-card-composer-actions">
                <button
                  type="button"
                  className="btn-primary btn-compact"
                  disabled={createColumnPending || !newColumnTitle.trim()}
                  onClick={submitColumn}
                >
                  Добавить
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-compact"
                  onClick={() => {
                    setColumnComposerOpen(false)
                    setNewColumnTitle('')
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {moveMutation.isError && (
        <p className="kanban-error kanban-error-floating" role="alert">
          {(moveMutation.error as Error).message}
        </p>
      )}
    </DndContext>
  )
}
