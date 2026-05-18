import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TaskDto } from '../types'

const priorityClass: Record<string, string> = {
  Low: 'prio-low',
  Normal: 'prio-normal',
  High: 'prio-high',
  Urgent: 'prio-urgent',
}

type Props = {
  task: TaskDto
  onOpen?: (task: TaskDto) => void
  onDelete?: (task: TaskDto) => void
}

export function TaskCard({ task, onOpen, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const due = task.dueDateUtc ? new Date(task.dueDateUtc) : null

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.45 : 1,
      }}
      className="task-card"
    >
      <div className="task-card-top">
        <button
          type="button"
          className="task-card-drag"
          aria-label="Перетащить"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <div className="task-card-actions">
          <button
            type="button"
            className="icon-btn task-card-action"
            title="Редактировать"
            aria-label="Редактировать"
            onClick={(e) => {
              e.stopPropagation()
              onOpen?.(task)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-btn danger task-card-action"
            title="Удалить"
            aria-label="Удалить"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(task)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            >
              ⌫
            </button>
        </div>
      </div>
      <div className="task-card-main" onClick={() => onOpen?.(task)} role="presentation">
        <div className="task-card-badges">
          <span className={`task-prio ${priorityClass[task.priority] ?? 'prio-normal'}`}>{task.priority}</span>
          {task.blockerTaskIds.length > 0 && (
            <span className="task-blocked" title="Есть незакрытые зависимости">
              блок
            </span>
          )}
        </div>
        <div className="task-card-title">{task.title}</div>
        {task.tags.length > 0 && (
          <div className="task-card-tags">
            {task.tags.map((t) => (
              <span
                key={t.id}
                className="task-tag-chip"
                style={t.color ? { borderColor: t.color, color: t.color } : undefined}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
        {due && <div className="task-card-due">{due.toLocaleDateString()}</div>}
        {task.description && <p className="task-card-desc">{task.description}</p>}
      </div>
    </div>
  )
}
