import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  addDependency,
  deleteTask,
  removeDependency,
  updateTask,
} from '../api'
import type { BoardDetailDto, TagDto, TaskDto, TaskPriority, UserAdminDto } from '../types'

type Props = {
  task: TaskDto | null
  board: BoardDetailDto | null
  tags: TagDto[]
  users: UserAdminDto[]
  boardId: string
  onClose: () => void
}

const priorities: TaskPriority[] = ['Low', 'Normal', 'High', 'Urgent']

export function CardModal({ task, board, tags, users, boardId, onClose }: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Normal')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueLocal, setDueLocal] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [blockerToAdd, setBlockerToAdd] = useState('')

  const flatTasks = useMemo(() => {
    if (!board) return []
    return board.columns.flatMap((c) => c.tasks).sort((a, b) => a.title.localeCompare(b.title))
  }, [board])

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPriority(task.priority)
    setAssigneeId(task.assigneeId ?? '')
    if (task.dueDateUtc) {
      const d = new Date(task.dueDateUtc)
      const pad = (n: number) => String(n).padStart(2, '0')
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      setDueLocal(local)
    } else {
      setDueLocal('')
    }
    setSelectedTags(new Set(task.tags.map((t) => t.id)))
  }, [task])

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['board', boardId] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!task) return
      const dueUtc =
        dueLocal.trim() === ''
          ? null
          : new Date(dueLocal).toISOString()
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() === '' ? null : description,
        assigneeId: assigneeId === '' ? null : assigneeId,
        priority,
        dueDateUtc: dueUtc,
        tagIds: [...selectedTags],
      })
    },
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (task) await deleteTask(task.id)
    },
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const addBlockerMutation = useMutation({
    mutationFn: async () => {
      if (!task || !blockerToAdd || blockerToAdd === task.id) return
      await addDependency(task.id, blockerToAdd)
    },
    onSuccess: () => {
      setBlockerToAdd('')
      invalidate()
    },
  })

  const removeBlockerMutation = useMutation({
    mutationFn: async (bid: string) => {
      if (!task) return
      await removeDependency(task.id, bid)
    },
    onSuccess: () => invalidate(),
  })

  if (!task) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-floating-panel glass-panel card-modal-wide" role="dialog" aria-modal onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Карточка</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            <span>Заголовок</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>Описание</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </label>
          <label className="field">
            <span>Приоритет</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Исполнитель</span>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Срок</span>
            <input type="datetime-local" value={dueLocal} onChange={(e) => setDueLocal(e.target.value)} />
          </label>

          <div className="field">
            <span>Теги</span>
            <div className="tag-picks">
              {tags.map((t) => (
                <label key={t.id} className="tag-pick">
                  <input
                    type="checkbox"
                    checked={selectedTags.has(t.id)}
                    onChange={(e) => {
                      const next = new Set(selectedTags)
                      if (e.target.checked) next.add(t.id)
                      else next.delete(t.id)
                      setSelectedTags(next)
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Блокируют эту карточку</span>
            <ul className="blocker-list">
              {task.blockerTaskIds.map((bid) => {
                const bt = flatTasks.find((x) => x.id === bid)
                return (
                  <li key={bid}>
                    {bt?.title ?? bid}
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => removeBlockerMutation.mutate(bid)}
                    >
                      Убрать
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="row gap">
              <select value={blockerToAdd} onChange={(e) => setBlockerToAdd(e.target.value)}>
                <option value="">Выберите задачу-предпосылку…</option>
                {flatTasks
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => addBlockerMutation.mutate()}
                disabled={!blockerToAdd || addBlockerMutation.isPending}
              >
                Добавить
              </button>
            </div>
            {addBlockerMutation.isError && (
              <p className="error">{(addBlockerMutation.error as Error).message}</p>
            )}
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn-danger" onClick={() => deleteMutation.mutate()}>
            Удалить
          </button>
          <div className="spacer" />
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
          >
            Сохранить
          </button>
        </footer>

        {saveMutation.isError && <p className="error">{(saveMutation.error as Error).message}</p>}
        {deleteMutation.isError && <p className="error modal-error">{(deleteMutation.error as Error).message}</p>}
      </div>
    </div>
  )
}
