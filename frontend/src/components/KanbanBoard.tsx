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
import type { BoardDetailDto } from '../types'

type Props = {
  boardId: string
  board: BoardDetailDto
}

export function KanbanBoard({ boardId, board }: Props) {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {sortedColumns.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
      {moveMutation.isError && (
        <p className="kanban-error" role="alert">
          {(moveMutation.error as Error).message}
        </p>
      )}
    </DndContext>
  )
}
