import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TaskDto } from '../types'

type Props = {
  task: TaskDto
}

export function TaskCard({ task }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.45 : 1,
      }}
      className="task-card"
      {...attributes}
      {...listeners}
    >
      <div className="task-card-title">{task.title}</div>
      {task.description && <p className="task-card-desc">{task.description}</p>}
    </div>
  )
}
