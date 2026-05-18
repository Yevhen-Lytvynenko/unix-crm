import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { columnDropId } from '../moveLogic'
import type { ColumnDto, TaskDto } from '../types'
import { TaskCard } from './TaskCard'

type Props = {
  column: ColumnDto
  onTaskOpen?: (task: TaskDto) => void
  onDeleteTask?: (task: TaskDto) => void
  onEditColumn?: (column: ColumnDto) => void
  onDeleteColumn?: (column: ColumnDto) => void
  onAddCard?: (columnId: string, title: string) => void
  addCardPending?: boolean
}

export function KanbanColumn({
  column,
  onTaskOpen,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
  onAddCard,
  addCardPending,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDropId(column.id),
  })

  const tasks = column.tasks.slice().sort((a, b) => a.position - b.position)
  const items = tasks.map((t) => t.id)

  const [composerOpen, setComposerOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')

  const submitCard = () => {
    const t = draftTitle.trim()
    if (!t || !onAddCard) return
    onAddCard(column.id, t)
    setDraftTitle('')
    setComposerOpen(false)
  }

  return (
    <div ref={setNodeRef} className={`kanban-column${isOver ? ' kanban-column-over' : ''}`}>
      <div className="kanban-column-header">
        <div>
          <h2>{column.title}</h2>
          {column.isCompletionColumn && <span className="column-badge">Завершение</span>}
        </div>
        <div className="kanban-column-actions">
          {onEditColumn && (
            <button type="button" className="icon-btn" onClick={() => onEditColumn(column)} title="Изменить колонку">
              ✎
            </button>
          )}
          {onDeleteColumn && (
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => onDeleteColumn(column)}
              title="Удалить колонку"
            >
              ⌫
            </button>
          )}
        </div>
      </div>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="kanban-column-tasks">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onTaskOpen} onDelete={onDeleteTask} />
          ))}
        </div>
      </SortableContext>
      {onAddCard && (
        <div className="kanban-column-footer">
          {!composerOpen ? (
            <button type="button" className="kanban-add-card-trigger" onClick={() => setComposerOpen(true)}>
              + Добавить карточку
            </button>
          ) : (
            <div className="kanban-card-composer">
              <textarea
                className="kanban-card-composer-input"
                placeholder="Заголовок карточки"
                rows={3}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
              />
              <div className="kanban-card-composer-actions">
                <button
                  type="button"
                  className="btn-primary btn-compact"
                  disabled={addCardPending || !draftTitle.trim()}
                  onClick={submitCard}
                >
                  Добавить
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-compact"
                  onClick={() => {
                    setComposerOpen(false)
                    setDraftTitle('')
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
