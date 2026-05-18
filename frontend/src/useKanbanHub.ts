import { useEffect } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { getToken } from './auth'
import { apiUrl } from './apiBase'

/** Keeps the board in sync when other clients move tasks. */
export function useKanbanHub(boardId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId) return

    const connection = new HubConnectionBuilder()
      .withUrl(apiUrl('/hubs/kanban'), {
        withCredentials: true,
        accessTokenFactory: () => getToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('ReceiveTaskMove', () => {
      void queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    })

    let cancelled = false

    void (async () => {
      try {
        await connection.start()
        if (cancelled) return
        await connection.invoke('JoinBoard', boardId)
      } catch (err) {
        console.error('SignalR connection failed:', err)
      }
    })()

    return () => {
      cancelled = true
      void connection.invoke('LeaveBoard', boardId).catch(() => undefined)
      void connection.stop()
    }
  }, [boardId, queryClient])
}
