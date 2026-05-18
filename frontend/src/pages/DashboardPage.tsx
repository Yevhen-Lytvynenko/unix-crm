import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchDashboardOverview, fetchMe, fetchSystemInfo } from '../api'
import { setStoredBoardId } from '../boardStorage'

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="dashboard-stat-card glass-panel">
      <div className="dashboard-stat-value">{value}</div>
      <div className="dashboard-stat-label">{label}</div>
      {hint && <div className="dashboard-stat-hint muted small">{hint}</div>}
    </div>
  )
}

export function DashboardPage() {
  const overviewQuery = useQuery({ queryKey: ['dashboard', 'overview'], queryFn: fetchDashboardOverview })
  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const systemQuery = useQuery({
    queryKey: ['systemInfo'],
    queryFn: fetchSystemInfo,
    enabled: meQuery.data?.role === 'Admin',
  })

  if (overviewQuery.isPending) {
    return (
      <div className="view-root center-message">
        <p className="muted">Загрузка обзора…</p>
      </div>
    )
  }

  if (overviewQuery.isError) {
    return (
      <div className="view-root center-message">
        <p className="error">{(overviewQuery.error as Error).message}</p>
      </div>
    )
  }

  const d = overviewQuery.data
  const isAdmin = meQuery.data?.role === 'Admin'

  return (
    <div className="view-root dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Обзор CRM</h1>
          <p className="muted small dashboard-subtitle">Сводка по доскам, задачам и меткам</p>
        </div>
        <nav className="dashboard-quick-links">
          <Link className="btn-ghost btn-compact" to="/">
            Канбан
          </Link>
          <Link className="btn-ghost btn-compact" to="/dependencies">
            Зависимости
          </Link>
          {isAdmin && (
            <Link className="btn-ghost btn-compact" to="/admin">
              Админ-панель
            </Link>
          )}
        </nav>
      </header>

      <div className="dashboard-grid dashboard-grid-primary">
        <StatCard label="Досок" value={d.boardCount} />
        <StatCard label="Колонок" value={d.columnCount} />
        <StatCard label="Карточек" value={d.taskCount} />
        <StatCard label="Тегов" value={d.tagCount} />
        {d.userCount != null && <StatCard label="Пользователей" value={d.userCount} hint="Только для админов" />}
      </div>

      <section className="dashboard-section glass-panel">
        <h2 className="dashboard-section-title">Приоритеты</h2>
        <div className="dashboard-grid dashboard-grid-compact">
          <StatCard label="Low" value={d.tasksLow} />
          <StatCard label="Normal" value={d.tasksNormal} />
          <StatCard label="High" value={d.tasksHigh} />
          <StatCard label="Urgent" value={d.tasksUrgent} />
        </div>
      </section>

      <section className="dashboard-section glass-panel">
        <h2 className="dashboard-section-title">Сроки и исполнители</h2>
        <div className="dashboard-grid dashboard-grid-compact">
          <StatCard label="Просрочено (UTC)" value={d.overdueCount} />
          <StatCard label="Срок в 7 дней" value={d.dueWithin7DaysCount} hint="от сегодняшнего дня UTC" />
          <StatCard label="Без исполнителя" value={d.unassignedCount} />
        </div>
      </section>

      <section className="dashboard-section glass-panel">
        <h2 className="dashboard-section-title">Зависимости</h2>
        <div className="dashboard-grid dashboard-grid-compact">
          <StatCard label="Карточек с предпосылками" value={d.tasksWithBlockersCount} />
          <StatCard label="Связей в графе" value={d.dependencyLinkCount} />
        </div>
      </section>

      <section className="dashboard-section glass-panel">
        <h2 className="dashboard-section-title">Доски</h2>
        {d.boards.length === 0 ? (
          <p className="muted">Нет досок</p>
        ) : (
          <ul className="dashboard-board-list">
            {d.boards.map((b) => (
              <li key={b.id} className="dashboard-board-row">
                <div>
                  <strong>{b.title}</strong>
                  <span className="muted small"> · {b.taskCount} карточек</span>
                </div>
                <Link
                  className="btn-ghost btn-compact"
                  to="/"
                  onClick={() => setStoredBoardId(b.id)}
                >
                  Открыть
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && systemQuery.data && (
        <section className="dashboard-section glass-panel">
          <h2 className="dashboard-section-title">О системе</h2>
          <p className="small">
            <strong>Версия:</strong> {systemQuery.data.version} · <strong>Дата:</strong>{' '}
            {systemQuery.data.releaseDate}
          </p>
        </section>
      )}
    </div>
  )
}
