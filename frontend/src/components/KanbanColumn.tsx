import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { columnDropId } from '../moveLogic'
import type { ColumnDto } from '../types'
import { TaskCard } from './TaskCard'

type Props = {
  column: ColumnDto
}

export function KanbanColumn({ column }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDropId(column.id),
  })

  const tasks = column.tasks.slice().sort((a, b) => a.position - b.position)
  const items = tasks.map((t) => t.id)

  return (
    <div ref={setNodeRef} className={`kanban-column${isOver ? ' kanban-column-over' : ''}`}>
      <div className="kanban-column-header">
        <h2>{column.title}</h2>
      </div>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="kanban-column-tasks">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
