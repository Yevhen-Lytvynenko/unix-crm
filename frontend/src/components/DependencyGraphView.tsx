import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { addDependency, removeDependency } from '../api'
import type { BoardDetailDto, TaskDto } from '../types'

type Pos = { x: number; y: number }

type LayoutNode = {
  task: TaskDto
  cx: number
  cy: number
}

type ColumnRing = {
  id: string
  title: string
  cx: number
  cy: number
  r: number
}

const MARGIN = 56
const COL_GAP = 48
const NODE_R = 40
const BASE_R = 48

function shortenSegment(
  from: Pos,
  to: Pos,
  trimStart: number,
  trimEnd: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const t0 = Math.min(trimStart, len * 0.45)
  const t1 = Math.min(trimEnd, len * 0.45)
  if (t0 + t1 >= len) {
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    return { x1: mid.x, y1: mid.y, x2: mid.x, y2: mid.y }
  }
  return {
    x1: from.x + ux * t0,
    y1: from.y + uy * t0,
    x2: to.x - ux * t1,
    y2: to.y - uy * t1,
  }
}

type Props = {
  board: BoardDetailDto
  boardId: string
  onOpenTask: (task: TaskDto) => void
}

export function DependencyGraphView({ board, boardId, onOpenTask }: Props) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addBlockedId, setAddBlockedId] = useState('')
  const [addBlockerId, setAddBlockerId] = useState('')

  const { tasksById, sortedTasks, layout, columnRings, viewWidth, viewHeight, markerId } =
    useMemo(() => {
      const columns = board.columns.slice().sort((a, b) => a.position - b.position)
      const tasksByIdMap = new Map<string, TaskDto>()
      const sortedTasksList: TaskDto[] = []

      const radii = columns.map((col) =>
        Math.max(72, Math.min(200, BASE_R * Math.sqrt(Math.max(1, col.tasks.length)))),
      )

      let x = MARGIN
      const centers: number[] = []
      for (let i = 0; i < columns.length; i++) {
        x += radii[i]
        centers.push(x)
        x += radii[i] + (i < columns.length - 1 ? COL_GAP : 0)
      }

      const maxR = radii.length ? Math.max(...radii) : BASE_R
      const cy = MARGIN + maxR + NODE_R

      const rings: ColumnRing[] = columns.map((col, i) => ({
        id: col.id,
        title: col.title,
        cx: centers[i],
        cy,
        r: radii[i],
      }))

      const layoutList: LayoutNode[] = []
      columns.forEach((col, i) => {
        const tasks = col.tasks.slice().sort((a, b) => a.position - b.position)
        for (const t of tasks) {
          tasksByIdMap.set(t.id, t)
          sortedTasksList.push(t)
        }
        const cxCol = centers[i]
        const r = radii[i]
        const n = tasks.length
        tasks.forEach((task, j) => {
          const angle = n === 1 ? -Math.PI / 2 : -Math.PI / 2 + (j * 2 * Math.PI) / n
          layoutList.push({
            task,
            cx: cxCol + r * Math.cos(angle),
            cy: cy + r * Math.sin(angle),
          })
        })
      })

      const w = Math.max(320, x + MARGIN)
      const h = cy + maxR + MARGIN + NODE_R
      const marker = `arrow-dep-${board.id.replace(/[^a-zA-Z0-9]/g, '')}`

      return {
        tasksById: tasksByIdMap,
        sortedTasks: sortedTasksList,
        layout: layoutList,
        columnRings: rings,
        viewWidth: w,
        viewHeight: h,
        markerId: marker,
      }
    }, [board])

  const positionByTaskId = useMemo(() => {
    const m = new Map<string, Pos>()
    for (const n of layout) {
      m.set(n.task.id, { x: n.cx, y: n.cy })
    }
    return m
  }, [layout])

  const selected = selectedId ? tasksById.get(selectedId) ?? null : null

  const addMut = useMutation({
    mutationFn: () => addDependency(addBlockedId, addBlockerId),
    onSuccess: async () => {
      setAddBlockedId('')
      setAddBlockerId('')
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const removeMut = useMutation({
    mutationFn: ({ blockedId, blockerId }: { blockedId: string; blockerId: string }) =>
      removeDependency(blockedId, blockerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const edges = useMemo(() => {
    const list: { blockerId: string; blockedId: string; key: string }[] = []
    for (const t of sortedTasks) {
      for (const bid of t.blockerTaskIds) {
        if (positionByTaskId.has(t.id) && positionByTaskId.has(bid)) {
          list.push({ blockerId: bid, blockedId: t.id, key: `${bid}->${t.id}` })
        }
      }
    }
    return list
  }, [sortedTasks, positionByTaskId])

  return (
    <div className="dep-graph-root">
      <p className="dep-graph-hint muted">
        На графе отображаются все задачи доски. Стрелка: предпосылка → заблокированная задача.
      </p>

      <div className="dep-graph-scroll">
        <svg
          className="dep-graph-svg"
          width={viewWidth}
          height={viewHeight}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label="Граф зависимостей задач"
        >
          <defs>
            <marker
              id={markerId}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="rgba(79, 70, 229, 0.55)" />
            </marker>
          </defs>

          <g className="dep-graph-columns">
            {columnRings.map((ring) => (
              <g key={ring.id}>
                <circle
                  cx={ring.cx}
                  cy={ring.cy}
                  r={ring.r}
                  fill="none"
                  stroke="rgba(79, 70, 229, 0.12)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <text x={ring.cx} y={ring.cy - ring.r - 18} textAnchor="middle" className="dep-graph-col-title">
                  {ring.title}
                </text>
              </g>
            ))}
          </g>

          <g className="dep-graph-edges">
            {edges.map(({ blockerId: bId, blockedId: tId, key }) => {
              const p1 = positionByTaskId.get(bId)!
              const p2 = positionByTaskId.get(tId)!
              const { x1, y1, x2, y2 } = shortenSegment(p1, p2, NODE_R + 6, NODE_R + 6)
              const incident = Boolean(selectedId && (tId === selectedId || bId === selectedId))
              const dim = Boolean(selectedId && !incident)
              return (
                <line
                  key={key}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={dim ? 'rgba(148, 163, 184, 0.35)' : 'rgba(79, 70, 229, 0.45)'}
                  strokeWidth={dim ? 1.5 : incident ? 2.5 : 2}
                  markerEnd={`url(#${markerId})`}
                />
              )
            })}
          </g>

          <g className="dep-graph-nodes">
            {layout.map(({ task, cx, cy }) => {
              const isSel = selectedId === task.id
              return (
                <g
                  key={task.id}
                  className={`dep-graph-node ${isSel ? 'selected' : ''}`}
                  transform={`translate(${cx}, ${cy})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId((id) => (id === task.id ? null : task.id))}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    onOpenTask(task)
                  }}
                >
                  <circle r={NODE_R} className="dep-graph-node-circle" />
                  <title>
                    {task.title}
                    {task.blockerTaskIds.length ? ` — предпосылок: ${task.blockerTaskIds.length}` : ''}
                  </title>
                  <text textAnchor="middle" y={4} className="dep-graph-node-label">
                    {truncate(task.title, 18)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <div className="dep-graph-panel glass-panel">
        <div className="dep-graph-panel-section">
          <h3 className="dep-graph-panel-title">Добавить зависимость</h3>
          <p className="dep-graph-help muted small">
            «Заблокирована» ждёт «Предпосылку». Нельзя создать цикл.
          </p>
          <div className="dep-graph-form-row">
            <label className="field tight">
              <span>Заблокирована</span>
              <select value={addBlockedId} onChange={(e) => setAddBlockedId(e.target.value)}>
                <option value="">— задача —</option>
                {sortedTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field tight">
              <span>Предпосылка</span>
              <select value={addBlockerId} onChange={(e) => setAddBlockerId(e.target.value)}>
                <option value="">— задача —</option>
                {sortedTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary btn-compact dep-graph-add-btn"
              disabled={
                addMut.isPending ||
                !addBlockedId ||
                !addBlockerId ||
                addBlockedId === addBlockerId
              }
              onClick={() => addMut.mutate()}
            >
              Добавить
            </button>
          </div>
          {addMut.isError && <p className="error">{(addMut.error as Error).message}</p>}
        </div>

        <div className="dep-graph-panel-section">
          <h3 className="dep-graph-panel-title">Выбранная задача</h3>
          {!selected && (
            <p className="muted small">Клик по узлу — выделить; двойной клик — открыть карточку.</p>
          )}
          {selected && (
            <>
              <p className="dep-graph-selected-title">
                <strong>{selected.title}</strong>
              </p>
              <button type="button" className="btn-ghost btn-compact" onClick={() => onOpenTask(selected)}>
                Открыть карточку
              </button>
              <div className="dep-graph-blockers">
                <span className="small muted">Предпосылки (блокируют эту задачу):</span>
                {selected.blockerTaskIds.length === 0 && <p className="muted small">Нет</p>}
                <ul className="dep-graph-blocker-list">
                  {selected.blockerTaskIds.map((bid) => {
                    const bt = tasksById.get(bid)
                    return (
                      <li key={bid}>
                        <span>{bt?.title ?? bid}</span>
                        <button
                          type="button"
                          className="linkish btn-compact-inline"
                          onClick={() => removeMut.mutate({ blockedId: selected.id, blockerId: bid })}
                          disabled={removeMut.isPending}
                        >
                          Убрать
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}
          {removeMut.isError && <p className="error">{(removeMut.error as Error).message}</p>}
        </div>
      </div>
    </div>
  )
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}
