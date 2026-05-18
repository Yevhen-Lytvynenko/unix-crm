import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createTag,
  deleteTag,
  fetchBoard,
  fetchBoardSummaries,
  fetchSystemInfo,
  fetchAdminUsers,
  fetchTags,
  updateColumn,
  updateTag,
} from '../api'
import type { BoardSummaryDto, TagDto } from '../types'

export function AdminPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'users' | 'tags' | 'columns' | 'about'>('users')
  const [boardId, setBoardId] = useState<string>('')

  const usersQuery = useQuery({ queryKey: ['adminUsers'], queryFn: fetchAdminUsers })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: fetchTags })
  const boardsQuery = useQuery({ queryKey: ['boards'], queryFn: fetchBoardSummaries })
  const systemQuery = useQuery({ queryKey: ['systemInfo'], queryFn: fetchSystemInfo })

  const boardDetailQuery = useQuery({
    queryKey: ['board', boardId, 'admin'],
    queryFn: () => fetchBoard(boardId, { assigneeId: '', tagId: '', priority: '', dueFrom: '', dueTo: '' }),
    enabled: Boolean(boardId) && tab === 'columns',
  })

  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('')

  const createTagMut = useMutation({
    mutationFn: () => createTag(newTagName.trim(), newTagColor || null, null),
    onSuccess: async () => {
      setNewTagName('')
      setNewTagColor('')
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  return (
    <div className="view-root admin-view">
      <header className="admin-toolbar glass-panel">
        <h1 className="admin-heading">Админ-панель</h1>
        <nav className="admin-tabs-inline">
          {(['users', 'tags', 'columns', 'about'] as const).map((t) => (
            <button key={t} type="button" className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
              {t === 'users' && 'Пользователи'}
              {t === 'tags' && 'Теги'}
              {t === 'columns' && 'Колонки'}
              {t === 'about' && 'О системе'}
            </button>
          ))}
        </nav>
      </header>

      <div className="admin-scroll">
        <div className="admin-body glass-panel">
          {tab === 'users' && (
            <div>
              <h2 className="section-title">Пользователи</h2>
              {usersQuery.isPending && <p className="muted">Загрузка…</p>}
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Роль</th>
                      <th>Смена пароля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersQuery.data?.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.role}</td>
                        <td>{u.mustChangePassword ? 'да' : 'нет'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'tags' && (
            <div>
              <h2 className="section-title">Теги</h2>
              <form
                className="row-input tight"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!newTagName.trim()) return
                  createTagMut.mutate()
                }}
              >
                <input placeholder="Новый тег" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                <input placeholder="#цвет" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} />
                <button type="submit" className="btn-primary btn-compact" disabled={createTagMut.isPending}>
                  Добавить
                </button>
              </form>
              {tagsQuery.isPending && <p className="muted">Загрузка…</p>}
              <ul className="admin-list">
                {tagsQuery.data?.map((t) => (
                  <TagRow key={t.id} tag={t} onChanged={() => void queryClient.invalidateQueries({ queryKey: ['tags'] })} />
                ))}
              </ul>
            </div>
          )}

          {tab === 'columns' && (
            <div>
              <h2 className="section-title">Колонки и завершение</h2>
              <label className="field max-w">
                <span>Доска</span>
                <select
                  value={boardId}
                  onChange={(e) => {
                    setBoardId(e.target.value)
                  }}
                >
                  <option value="">— выберите доску —</option>
                  {boardsQuery.data?.map((b: BoardSummaryDto) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
              {boardDetailQuery.isPending && <p className="muted">Загрузка…</p>}
              <ul className="admin-list">
                {boardDetailQuery.data?.columns
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((c) => (
                    <li key={c.id} className="admin-list-item">
                      <strong>{c.title}</strong>
                      <label className="inline row-inline">
                        <input
                          type="checkbox"
                          checked={c.isCompletionColumn}
                          onChange={(e) => {
                            void updateColumn(c.id, { isCompletionColumn: e.target.checked }).then(() =>
                              queryClient.invalidateQueries({ queryKey: ['board', boardId, 'admin'] }),
                            )
                          }}
                        />
                        Завершение
                      </label>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {tab === 'about' && (
            <div>
              <h2 className="section-title">О системе</h2>
              {systemQuery.isPending && <p className="muted">Загрузка…</p>}
              {systemQuery.data && (
                <div className="about-block">
                  <p>
                    <strong>Версия:</strong> {systemQuery.data.version}
                  </p>
                  <p>
                    <strong>Дата релиза:</strong> {systemQuery.data.releaseDate}
                  </p>
                  <p className="changelog">{systemQuery.data.changelog}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TagRow({ tag, onChanged }: { tag: TagDto; onChanged: () => void }) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color ?? '')
  const mut = useMutation({
    mutationFn: () => updateTag(tag.id, { name: name.trim(), color: color || null }),
    onSuccess: onChanged,
  })
  const del = useMutation({
    mutationFn: () => deleteTag(tag.id),
    onSuccess: onChanged,
  })

  return (
    <li className="admin-list-item row stretch">
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#hex" />
      <button type="button" className="btn-ghost btn-compact" onClick={() => mut.mutate()}>
        Сохранить
      </button>
      <button type="button" className="btn-danger btn-compact" onClick={() => del.mutate()}>
        Удалить
      </button>
    </li>
  )
}
