import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import './App.css'
import { createTask, fetchBoard, fetchBoardSummaries } from './api'
import { KanbanBoard } from './components/KanbanBoard'
import { useKanbanHub } from './useKanbanHub'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function BoardApp() {
  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: fetchBoardSummaries,
  })

  const firstBoardId = useMemo(() => boardsQuery.data?.[0]?.id, [boardsQuery.data])
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined)

  const boardId = selectedBoardId ?? firstBoardId

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId!),
    enabled: Boolean(boardId),
  })

  useKanbanHub(boardId)

  const createMutation = useMutation({
    mutationFn: (title: string) => createTask(boardId!, title),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const [newTitle, setNewTitle] = useState('')

  if (boardsQuery.isPending) {
    return <p className="muted">Loading boards…</p>
  }

  if (boardsQuery.isError) {
    return (
      <p className="error" role="alert">
        {(boardsQuery.error as Error).message}
      </p>
    )
  }

  if (!boardsQuery.data?.length) {
    return <p className="muted">No boards found. Start the API and ensure PostgreSQL is seeded.</p>
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Unix CRM — Kanban</h1>
          <p className="muted">React · ASP.NET Core · PostgreSQL · SignalR</p>
        </div>
        <label className="board-picker">
          <span>Board</span>
          <select
            value={boardId ?? ''}
            onChange={(e) => setSelectedBoardId(e.target.value || undefined)}
          >
            {boardsQuery.data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      {boardQuery.isPending && <p className="muted">Loading board…</p>}
      {boardQuery.isError && (
        <p className="error" role="alert">
          {(boardQuery.error as Error).message}
        </p>
      )}
      {boardQuery.data && (
        <>
          <KanbanBoard boardId={boardId!} board={boardQuery.data} />
          <form
            className="new-task"
            onSubmit={(e) => {
              e.preventDefault()
              const title = newTitle.trim()
              if (!title || !boardId) return
              createMutation.mutate(title, {
                onSuccess: () => setNewTitle(''),
              })
            }}
          >
            <input
              type="text"
              placeholder="New task title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={createMutation.isPending}
            />
            <button type="submit" disabled={createMutation.isPending || !newTitle.trim()}>
              Add to first column
            </button>
          </form>
          {createMutation.isError && (
            <p className="error" role="alert">
              {(createMutation.error as Error).message}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BoardApp />
    </QueryClientProvider>
  )
}

export default App
